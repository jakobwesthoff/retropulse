use anyhow::{Context, Result};
use base64::Engine;
use image::codecs::png::{CompressionType, FilterType, PngEncoder};
use image::{DynamicImage, GenericImage, ImageEncoder};
use serde::Serialize;
use std::collections::BTreeMap;
use std::io::{Read, Seek};
use std::path::Path;

use std::io::Cursor;

fn uri_encode_image(image: DynamicImage) -> Result<String> {
    let mut buf = Cursor::new(Vec::new());
    let encoder =
        PngEncoder::new_with_quality(&mut buf, CompressionType::Best, FilterType::Adaptive);
    encoder
        .write_image(
            image.as_bytes(),
            image.width(),
            image.height(),
            image.color().into(),
        )
        .context("failed to encode image")?;

    let scheme = "data:image/png;base64,";
    let encoded_image = base64::engine::general_purpose::STANDARD.encode(buf.into_inner());
    Ok(format!("{}{}", scheme, encoded_image))
}

struct Sprite(DynamicImage);
impl Sprite {
    pub fn from_image(image: &DynamicImage) -> Self {
        Sprite(image.clone())
    }

    pub fn from_sub_image(image: &DynamicImage, x: u32, y: u32, width: u32, height: u32) -> Self {
        Sprite(image.clone().crop_imm(x, y, width, height))
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SerializableSpriteMetadata {
    x: u32,
    y: u32,
    width: u32,
    height: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SerializableSpriteMap {
    meta: BTreeMap<String, SerializableSpriteMetadata>,
    encoded_image: String,
    width: u32,
    height: u32,
}

struct SpriteMap {
    sprites: BTreeMap<String, Sprite>,
}

impl SpriteMap {
    pub fn new() -> Self {
        SpriteMap {
            sprites: BTreeMap::new(),
        }
    }

    pub fn insert(&mut self, name: &str, sprite: Sprite) {
        self.sprites.insert(name.to_string(), sprite);
    }

    pub fn get(&self, name: &str) -> Option<&Sprite> {
        self.sprites.get(name)
    }

    pub fn generate(&self) -> Result<SerializableSpriteMap> {
        let mut meta = BTreeMap::new();
        let mut height_buckets = BTreeMap::new();

        // 1. Put all sprites into buckets based on their height
        for (name, sprite) in &self.sprites {
            let entry = height_buckets
                .entry(sprite.0.height())
                .or_insert_with(Vec::new);
            entry.push((name, sprite));
        }

        // 2. Calculate the height by summing all the buckets
        let height = height_buckets
            .iter()
            .fold(0, |acc, (height, _)| acc + height);

        // 3. Calculate the width by taking the maximum of the sum of each of the buckets
        let width = height_buckets.iter().fold(0, |acc, (_, sprites)| {
            let width = sprites
                .iter()
                .fold(0, |acc, (_, sprite)| acc + sprite.0.width());
            acc.max(width)
        });

        // 4. Generate the image by going from the largest bucket to the smallest
        let mut image = DynamicImage::new_rgba8(width, height);
        // Fill with all zero pixels (transparent black)
        image.as_mut_rgba8().unwrap().fill(0);

        let mut y = 0;
        for (height, sprites) in height_buckets.iter().rev() {
            let mut x = 0;
            for (name, sprite) in sprites {
                image
                    .copy_from(&sprite.0, x, y)
                    .context("failed to copy sprite to image")?;
                meta.insert(
                    name.to_string(),
                    SerializableSpriteMetadata {
                        x,
                        y,
                        width: sprite.0.width(),
                        height: sprite.0.height(),
                    },
                );
                x += sprite.0.width();
            }
            y += height;
        }

        Ok(SerializableSpriteMap {
            meta,
            encoded_image: uri_encode_image(image)?,
            width,
            height,
        })
    }
}

fn load_image<R: Read>(reader: R) -> Result<DynamicImage> {
    let mut reader = reader;
    let mut buf = Vec::new();
    reader.read_to_end(&mut buf)?;
    let image = image::load_from_memory(&buf).context("failed to load image")?;
    Ok(image)
}

pub struct WinampSkin {
    sprite_map: SpriteMap,
}

impl WinampSkin {
    pub fn from_wsz_in_memory(data: &[u8]) -> Result<Self> {
        let mut archive = zip::ZipArchive::new(Cursor::new(data))
            .context("wsz file should be a valid zip archive")?;
        Self::from_zip_archive(&mut archive)
    }

    pub fn from_wsz_file(path: &Path) -> Result<Self> {
        let wsz = std::fs::File::open(path).context("wsz file should be readable")?;
        let mut archive =
            zip::ZipArchive::new(wsz).context("wsz file should be a valid zip archive")?;

        Self::from_zip_archive(&mut archive)
    }

    fn from_zip_archive<R: Read + Seek>(archive: &mut zip::ZipArchive<R>) -> Result<Self> {
        let mut sprite_map = SpriteMap::new();

        for i in 0..archive.len() {
            let entry = archive
                .by_index(i)
                .context("failed to read file in zip archive")?;
            if !entry.is_file() {
                eprintln!("Skipping a non-file in the wsz archive: {:?}", entry.name());
                continue;
            }
            let file_name = entry.name();
            match file_name.to_lowercase().as_str() {
                "main.bmp" => {
                    let sprite =
                        sprite_map.insert("main-main", Sprite::from_image(&load_image(entry)?));
                }
                "cbuttons.bmp" => {
                    let image = load_image(entry)?;
                    sprite_map.insert(
                        "cbuttons-previous",
                        Sprite::from_sub_image(&image, 0, 0, 23, 18),
                    );
                    sprite_map.insert(
                        "cbuttons-previous:active",
                        Sprite::from_sub_image(&image, 0, 18, 23, 18),
                    );
                    sprite_map.insert(
                        "cbuttons-play",
                        Sprite::from_sub_image(&image, 23, 0, 23, 18),
                    );
                    sprite_map.insert(
                        "cbuttons-play:active",
                        Sprite::from_sub_image(&image, 23, 18, 23, 18),
                    );
                    sprite_map.insert(
                        "cbuttons-pause",
                        Sprite::from_sub_image(&image, 46, 0, 23, 18),
                    );
                    sprite_map.insert(
                        "cbuttons-pause:active",
                        Sprite::from_sub_image(&image, 46, 18, 23, 18),
                    );
                    sprite_map.insert(
                        "cbuttons-stop",
                        Sprite::from_sub_image(&image, 69, 0, 23, 18),
                    );
                    sprite_map.insert(
                        "cbuttons-stop:active",
                        Sprite::from_sub_image(&image, 69, 18, 23, 18),
                    );
                    sprite_map.insert(
                        "cbuttons-next",
                        Sprite::from_sub_image(&image, 92, 0, 22, 18),
                    );
                    sprite_map.insert(
                        "cbuttons-next:active",
                        Sprite::from_sub_image(&image, 92, 18, 22, 18),
                    );
                    sprite_map.insert(
                        "cbuttons-eject",
                        Sprite::from_sub_image(&image, 114, 0, 22, 16),
                    );
                    sprite_map.insert(
                        "cbuttons-eject:active",
                        Sprite::from_sub_image(&image, 114, 16, 22, 16),
                    );
                }
                "balance.bmp" => {
                    let image = load_image(entry)?;
                    sprite_map.insert(
                        "balance-thumb",
                        Sprite::from_sub_image(&image, 15, 422, 14, 11),
                    );
                    sprite_map.insert(
                        "balance-thumb:active",
                        Sprite::from_sub_image(&image, 0, 422, 14, 11),
                    );
                    for i in 0..28 {
                        sprite_map.insert(
                            &format!("balance-background-{}", i),
                            Sprite::from_sub_image(&image, 9, 15 * i, 38, 14),
                        );
                    }
                }
                "monoster.bmp" => {
                    let image = load_image(entry)?;
                    sprite_map.insert(
                        "monoster-stereo",
                        Sprite::from_sub_image(&image, 0, 12, 29, 12),
                    );
                    sprite_map.insert(
                        "monoster-stereo.checked",
                        Sprite::from_sub_image(&image, 0, 0, 29, 12),
                    );
                    sprite_map.insert(
                        "monoster-mono",
                        Sprite::from_sub_image(&image, 29, 12, 27, 12),
                    );
                    sprite_map.insert(
                        "monoster-mono.checked",
                        Sprite::from_sub_image(&image, 29, 0, 27, 12),
                    );
                }
                "posbar.bmp" => {
                    let image = load_image(entry)?;
                    sprite_map.insert(
                        "posbar-background",
                        Sprite::from_sub_image(&image, 0, 0, 248, 10),
                    );
                    sprite_map.insert(
                        "posbar-thumb",
                        Sprite::from_sub_image(&image, 248, 0, 29, 10),
                    );
                    sprite_map.insert(
                        "posbar-thumb:active",
                        Sprite::from_sub_image(&image, 278, 0, 29, 10),
                    );
                }
                "shufrep.bmp" => {
                    let image = load_image(entry)?;
                    sprite_map.insert(
                        "shufrep-shuffle",
                        Sprite::from_sub_image(&image, 28, 0, 47, 15),
                    );
                    sprite_map.insert(
                        "shufrep-shuffle:active",
                        Sprite::from_sub_image(&image, 28, 15, 47, 15),
                    );
                    sprite_map.insert(
                        "shufrep-shuffle.checked",
                        Sprite::from_sub_image(&image, 28, 30, 47, 15),
                    );
                    sprite_map.insert(
                        "shufrep-shuffle:active.checked",
                        Sprite::from_sub_image(&image, 28, 45, 47, 15),
                    );
                    sprite_map.insert(
                        "shufrep-repeat",
                        Sprite::from_sub_image(&image, 0, 0, 28, 15),
                    );
                    sprite_map.insert(
                        "shufrep-repeat:active",
                        Sprite::from_sub_image(&image, 0, 15, 28, 15),
                    );
                    sprite_map.insert(
                        "shufrep-repeat.checked",
                        Sprite::from_sub_image(&image, 0, 30, 28, 15),
                    );
                    sprite_map.insert(
                        "shufrep-repeat:active.checked",
                        Sprite::from_sub_image(&image, 0, 45, 28, 15),
                    );
                    sprite_map.insert("shufrep-eq", Sprite::from_sub_image(&image, 0, 61, 23, 12));
                    sprite_map.insert(
                        "shufrep-eq.checked",
                        Sprite::from_sub_image(&image, 0, 73, 23, 12),
                    );
                    sprite_map.insert(
                        "shufrep-eq:active",
                        Sprite::from_sub_image(&image, 46, 61, 23, 12),
                    );
                    sprite_map.insert(
                        "shufrep-eq:active.checked",
                        Sprite::from_sub_image(&image, 46, 73, 23, 12),
                    );
                    sprite_map.insert(
                        "shufrep-playlist",
                        Sprite::from_sub_image(&image, 23, 61, 23, 12),
                    );
                    sprite_map.insert(
                        "shufrep-playlist.checked",
                        Sprite::from_sub_image(&image, 23, 73, 23, 12),
                    );
                    sprite_map.insert(
                        "shufrep-playlist:active",
                        Sprite::from_sub_image(&image, 69, 61, 23, 12),
                    );
                    sprite_map.insert(
                        "shufrep-playlist:active.checked",
                        Sprite::from_sub_image(&image, 69, 73, 23, 12),
                    );
                }
                "titlebar.bmp" => {
                    let image = load_image(entry)?;
                    sprite_map.insert(
                        "titlebar-main",
                        Sprite::from_sub_image(&image, 27, 15, 275, 14),
                    );
                    sprite_map.insert(
                        "titlebar-main:active",
                        Sprite::from_sub_image(&image, 27, 0, 275, 14),
                    );
                    sprite_map.insert(
                        "titlebar-easter-egg",
                        Sprite::from_sub_image(&image, 27, 72, 275, 14),
                    );
                    sprite_map.insert(
                        "titlebar-easter-egg:active",
                        Sprite::from_sub_image(&image, 27, 57, 275, 14),
                    );
                    sprite_map.insert(
                        "titlebar-options",
                        Sprite::from_sub_image(&image, 0, 0, 9, 9),
                    );
                    sprite_map.insert(
                        "titlebar-options:active",
                        Sprite::from_sub_image(&image, 0, 9, 9, 9),
                    );
                    sprite_map.insert(
                        "titlebar-minimize",
                        Sprite::from_sub_image(&image, 9, 0, 9, 9),
                    );
                    sprite_map.insert(
                        "titlebar-minimize:active",
                        Sprite::from_sub_image(&image, 9, 9, 9, 9),
                    );
                    sprite_map.insert(
                        "titlebar-shade",
                        Sprite::from_sub_image(&image, 0, 18, 9, 9),
                    );
                    sprite_map.insert(
                        "titlebar-shade:active",
                        Sprite::from_sub_image(&image, 9, 18, 9, 9),
                    );
                    sprite_map.insert(
                        "titlebar-close",
                        Sprite::from_sub_image(&image, 18, 0, 9, 9),
                    );
                    sprite_map.insert(
                        "titlebar-close:active",
                        Sprite::from_sub_image(&image, 18, 9, 9, 9),
                    );
                    sprite_map.insert(
                        "titlebar-clutter-bar",
                        Sprite::from_sub_image(&image, 304, 0, 8, 43),
                    );
                    sprite_map.insert(
                        "titlebar-clutter-bar:disabled",
                        Sprite::from_sub_image(&image, 312, 0, 8, 43),
                    );
                    sprite_map.insert(
                        "titlebar-clutter-bar-button-o:selected",
                        Sprite::from_sub_image(&image, 304, 47, 8, 8),
                    );
                    sprite_map.insert(
                        "titlebar-clutter-bar-button-a:selected",
                        Sprite::from_sub_image(&image, 312, 55, 8, 7),
                    );
                    sprite_map.insert(
                        "titlebar-clutter-bar-button-i:selected",
                        Sprite::from_sub_image(&image, 320, 62, 8, 7),
                    );
                    sprite_map.insert(
                        "titlebar-clutter-bar-button-d:selected",
                        Sprite::from_sub_image(&image, 328, 69, 8, 8),
                    );
                    sprite_map.insert(
                        "titlebar-clutter-bar-button-v:selected",
                        Sprite::from_sub_image(&image, 336, 77, 8, 7),
                    );
                    sprite_map.insert(
                        "titlebar-shade-background",
                        Sprite::from_sub_image(&image, 27, 42, 275, 14),
                    );
                    sprite_map.insert(
                        "titlebar-shade-background:selected",
                        Sprite::from_sub_image(&image, 27, 29, 275, 14),
                    );
                    sprite_map.insert(
                        "titlebar-shade-button:selected",
                        Sprite::from_sub_image(&image, 0, 27, 9, 9),
                    );
                    sprite_map.insert(
                        "titlebar-shade-button:selected:active",
                        Sprite::from_sub_image(&image, 9, 27, 9, 9),
                    );
                    sprite_map.insert(
                        "titlebar-shade-position-background",
                        Sprite::from_sub_image(&image, 0, 36, 17, 7),
                    );
                    sprite_map.insert(
                        "titlebar-shade-position-thumb",
                        Sprite::from_sub_image(&image, 20, 36, 3, 7),
                    );
                    sprite_map.insert(
                        "titlebar-shade-position-thumb:left",
                        Sprite::from_sub_image(&image, 17, 36, 3, 7),
                    );
                    sprite_map.insert(
                        "titlebar-shade-position-thumb:right",
                        Sprite::from_sub_image(&image, 23, 36, 3, 7),
                    );
                }
                "volume.bmp" => {
                    let image = load_image(entry)?;
                    for i in 0..28 {
                        sprite_map.insert(
                            &format!("volume-background-{}", i),
                            Sprite::from_sub_image(&image, 0, 15 * i, 68, 14),
                        );
                    }
                    sprite_map.insert(
                        "volume-thumb",
                        Sprite::from_sub_image(&image, 15, 422, 14, 11),
                    );
                    sprite_map.insert(
                        "volume-thumb:active",
                        Sprite::from_sub_image(&image, 0, 422, 14, 11),
                    );
                }
                "playpaus.bmp" => {
                    let image = load_image(entry)?;
                    sprite_map.insert(
                        "playpaus-playing",
                        Sprite::from_sub_image(&image, 0, 0, 9, 9),
                    );
                    sprite_map.insert(
                        "playpaus-paused",
                        Sprite::from_sub_image(&image, 9, 0, 9, 9),
                    );
                    sprite_map.insert(
                        "playpaus-stopped",
                        Sprite::from_sub_image(&image, 18, 0, 9, 9),
                    );
                    sprite_map.insert(
                        "playpaus-not-working",
                        Sprite::from_sub_image(&image, 36, 0, 9, 9),
                    );
                    sprite_map.insert(
                        "playpaus-working",
                        Sprite::from_sub_image(&image, 39, 0, 9, 9),
                    );
                }
                "numbers.bmp" => {
                    let image = load_image(entry)?;
                    sprite_map.insert(
                        "numbers-no-minus-sign",
                        Sprite::from_sub_image(&image, 9, 6, 5, 1),
                    );
                    sprite_map.insert(
                        "numbers-minus-sign",
                        Sprite::from_sub_image(&image, 20, 6, 5, 1),
                    );
                    sprite_map.insert(
                        "numbers-digit-0",
                        Sprite::from_sub_image(&image, 0, 0, 9, 13),
                    );
                    sprite_map.insert(
                        "numbers-digit-1",
                        Sprite::from_sub_image(&image, 9, 0, 9, 13),
                    );
                    sprite_map.insert(
                        "numbers-digit-2",
                        Sprite::from_sub_image(&image, 18, 0, 9, 13),
                    );
                    sprite_map.insert(
                        "numbers-digit-3",
                        Sprite::from_sub_image(&image, 27, 0, 9, 13),
                    );
                    sprite_map.insert(
                        "numbers-digit-4",
                        Sprite::from_sub_image(&image, 36, 0, 9, 13),
                    );
                    sprite_map.insert(
                        "numbers-digit-5",
                        Sprite::from_sub_image(&image, 45, 0, 9, 13),
                    );
                    sprite_map.insert(
                        "numbers-digit-6",
                        Sprite::from_sub_image(&image, 54, 0, 9, 13),
                    );
                    sprite_map.insert(
                        "numbers-digit-7",
                        Sprite::from_sub_image(&image, 63, 0, 9, 13),
                    );
                    sprite_map.insert(
                        "numbers-digit-8",
                        Sprite::from_sub_image(&image, 72, 0, 9, 13),
                    );
                    sprite_map.insert(
                        "numbers-digit-9",
                        Sprite::from_sub_image(&image, 81, 0, 9, 13),
                    );
                }
                "text.bmp" => {
                    let image = load_image(entry)?;
                    let charset = [
                        ("a", (0, 0)),
                        ("b", (5, 0)),
                        ("c", (10, 0)),
                        ("d", (15, 0)),
                        ("e", (20, 0)),
                        ("f", (25, 0)),
                        ("g", (30, 0)),
                        ("h", (35, 0)),
                        ("i", (40, 0)),
                        ("j", (45, 0)),
                        ("k", (50, 0)),
                        ("l", (55, 0)),
                        ("m", (60, 0)),
                        ("n", (65, 0)),
                        ("o", (70, 0)),
                        ("p", (75, 0)),
                        ("q", (80, 0)),
                        ("r", (85, 0)),
                        ("s", (90, 0)),
                        ("t", (95, 0)),
                        ("u", (100, 0)),
                        ("v", (105, 0)),
                        ("w", (110, 0)),
                        ("x", (115, 0)),
                        ("y", (120, 0)),
                        ("z", (125, 0)),
                        ("quote", (130, 0)),
                        ("at", (135, 0)),
                        ("space", (150, 0)),
                        ("zero", (0, 6)),
                        ("one", (5, 6)),
                        ("two", (10, 6)),
                        ("three", (15, 6)),
                        ("four", (20, 6)),
                        ("five", (25, 6)),
                        ("six", (30, 6)),
                        ("seven", (35, 6)),
                        ("eight", (40, 6)),
                        ("nine", (45, 6)),
                        ("elipsis", (50, 6)),
                        ("dot", (55, 6)),
                        ("colon", (60, 6)),
                        ("brace-open", (65, 6)),
                        ("brace-close", (70, 6)),
                        ("minus", (75, 6)),
                        ("single-quote", (80, 6)),
                        ("exclamation-mark", (85, 6)),
                        ("underscore", (90, 6)),
                        ("plus", (95, 6)),
                        ("backslash", (100, 6)),
                        ("slash", (105, 6)),
                        ("square-bracket-open", (110, 6)),
                        ("square-bracket-close", (115, 6)),
                        ("caret", (120, 6)),
                        ("ampersand", (125, 6)),
                        ("percent", (130, 6)),
                        ("comma", (135, 6)),
                        ("equal-sign", (140, 6)),
                        ("dollar", (145, 6)),
                        ("hash", (150, 6)),
                        ("a-with-ring-above", (0, 12)),
                        ("o-with-diaresis", (5, 12)),
                        ("a-with-diaresis", (10, 12)),
                        ("question-mark", (15, 12)),
                        ("asterisk", (20, 12)),
                    ];

                    for (name, pos) in charset.iter() {
                        sprite_map.insert(
                            &format!("text-{}", name),
                            Sprite::from_sub_image(&image, pos.0, pos.1, 5, 6),
                        );
                    }
                }
                _ => {}
            }
        }

        Ok(WinampSkin { sprite_map })
    }

    pub fn generate_sprite_map(&self) -> Result<SerializableSpriteMap> {
        self.sprite_map.generate()
    }
}
