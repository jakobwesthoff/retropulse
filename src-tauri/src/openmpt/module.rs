use anyhow::anyhow;
use anyhow::Result;
use serde::Serialize;
use std::cell::RefCell;
use std::ffi::c_void;
use std::ffi::CStr;
use std::ffi::CString;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use libopenmpt_sys::*;

#[derive(Eq, PartialEq, Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "key", content = "value")]
pub enum Metadata {
    Type(String),
    TypeLong(String),
    OriginalType(String),
    OriginalTypeLong(String),
    Container(String),
    ContainerLong(String),
    Tracker(String),
    Artist(String),
    Title(String),
    Date(String), //@TODO: provide in a parsed format,
    Message(String),
    MessageRaw(String),
    Warnings(String),
}

pub struct Module {
    handle: *mut openmpt_module,
    playback_end: Arc<AtomicBool>,
    metadata: RefCell<Option<Arc<Vec<Metadata>>>>,
}

impl Module {
    pub fn try_from_memory(data: &Vec<u8>) -> Result<Self> {
        let handle = unsafe {
            libopenmpt_sys::openmpt_module_create_from_memory2(
                data.as_ptr() as *const c_void,
                data.len(),
                None,
                std::ptr::null_mut(),
                None,
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                std::ptr::null(),
            )
        };
        if handle.is_null() {
            // @TODO: Implement proper error retrieval from libopenmpt and
            // corresponding error propagation
            return Err(anyhow!("Could not load Module file"));
        }

        Ok(Self {
            handle,
            playback_end: Arc::new(AtomicBool::new(false)),
            metadata: RefCell::new(None),
        })
    }

    pub fn read(&mut self, rate: i32, data: &mut [f32]) {
        unsafe {
            let n_read = openmpt_module_read_interleaved_float_stereo(
                self.handle,
                rate,
                data.len() / 2,
                data.as_mut_ptr(),
            );
            if n_read == 0 {
                self.playback_end.store(true, Ordering::SeqCst);
            }
        };
    }

    pub fn get_duration_seconds(&self) -> f64 {
        unsafe { openmpt_module_get_duration_seconds(self.handle) }
    }

    pub fn get_position_seconds(&self) -> f64 {
        unsafe { openmpt_module_get_position_seconds(self.handle) }
    }

    pub fn get_metadata(&self) -> Arc<Vec<Metadata>> {
        if self.metadata.borrow().is_none() {
            let mut metadata = self.metadata.borrow_mut();
            let mut m = Vec::new();
            let available_keys: String = unsafe {
                CStr::from_ptr(openmpt_module_get_metadata_keys(self.handle))
                    .to_str()
                    .unwrap()
                    .to_string()
            };

            for strkey in available_keys.split(';') {
                let strkey_c = CString::new(strkey).unwrap();
                let strvalue = unsafe {
                    CStr::from_ptr(openmpt_module_get_metadata(self.handle, strkey_c.as_ptr()))
                        .to_str()
                        .unwrap()
                        .to_string()
                };

                if strvalue.is_empty() {
                    continue;
                }

                let value = match strkey {
                    "type" => Metadata::Type(strvalue),
                    "type_long" => Metadata::TypeLong(strvalue),
                    "originaltype" => Metadata::OriginalType(strvalue),
                    "originaltype_long" => Metadata::OriginalTypeLong(strvalue),
                    "container" => Metadata::Container(strvalue),
                    "container_long" => Metadata::ContainerLong(strvalue),
                    "tracker" => Metadata::Tracker(strvalue),
                    "artist" => Metadata::Artist(strvalue),
                    "title" => Metadata::Title(strvalue),
                    "date" => Metadata::Date(strvalue),
                    "message" => Metadata::Message(strvalue),
                    "message_raw" => Metadata::MessageRaw(strvalue),
                    "warnings" => Metadata::Warnings(strvalue),
                    _ => panic!("Unknown metadata key {}", strkey),
                };

                m.push(value);
            }

            *metadata = Some(Arc::new(m));
        }

        self.metadata.borrow().as_ref().unwrap().clone()
    }
}

// @TODO: Is this really needed? For what exactly
unsafe impl Send for Module {}
