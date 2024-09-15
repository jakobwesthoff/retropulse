use anyhow::anyhow;
use anyhow::Result;
use std::ffi::c_void;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use libopenmpt_sys::*;

pub struct Module {
    handle: *mut openmpt_module,
    pub playback_end: Arc<AtomicBool>,
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
}

unsafe impl Send for Module {}
