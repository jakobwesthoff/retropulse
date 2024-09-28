use anyhow::{Context, Result};
use config::{Config, Environment, File};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct AppConfig {
    pub use_winamp_skin: bool,
    pub winamp_skin_path: Option<String>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            use_winamp_skin: false,
            winamp_skin_path: None,
        }
    }
}

impl AppConfig {
    fn get_path<R: Runtime>(app: &AppHandle<R>) -> Result<std::path::PathBuf> {
        let config_path = app
            .path()
            .app_data_dir()
            .context("Should have an app_data_dir")?;
        Ok(config_path.join("app_config.toml"))
    }
    pub fn load<R: Runtime>(app: &AppHandle<R>) -> Result<Self> {
        let cfg = Config::builder()
            .add_source(File::with_name(Self::get_path(app)?.to_str().unwrap()).required(false))
            .add_source(
                Environment::with_prefix("RETROPULSE")
                    .try_parsing(true)
                    .convert_case(config::Case::Snake),
            )
            .build()
            .context("AppConfig should be loadable")?;

        Ok(cfg
            .try_deserialize()
            .context("AppConfig should be deserializable")?)
    }

    pub fn save<R: Runtime>(&self, app: &AppHandle<R>) -> Result<()> {
        let config_str =
            toml::to_string(self).context("AppConfig should be serializable to toml")?;
        std::fs::write(Self::get_path(app)?, config_str)
            .context("Serialized AppConfig should be writable to file")?;
        Ok(())
    }
}
