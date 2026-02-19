#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

const SERVICE_NAME: &str = "com.bymr.next.client";
const TOKEN_ACCOUNT: &str = "auth_token";

#[tauri::command]
fn get_auth_token() -> Result<Option<String>, String> {
  let entry = keyring::Entry::new(SERVICE_NAME, TOKEN_ACCOUNT).map_err(|e| e.to_string())?;

  match entry.get_password() {
    Ok(token) => Ok(Some(token)),
    Err(keyring::Error::NoEntry) => Ok(None),
    Err(e) => Err(e.to_string()),
  }
}

#[tauri::command]
fn set_auth_token(token: String) -> Result<(), String> {
  if token.trim().is_empty() {
    return Err("token cannot be empty".to_string());
  }

  let entry = keyring::Entry::new(SERVICE_NAME, TOKEN_ACCOUNT).map_err(|e| e.to_string())?;
  entry.set_password(&token).map_err(|e| e.to_string())
}

#[tauri::command]
fn clear_auth_token() -> Result<(), String> {
  let entry = keyring::Entry::new(SERVICE_NAME, TOKEN_ACCOUNT).map_err(|e| e.to_string())?;

  match entry.delete_credential() {
    Ok(_) | Err(keyring::Error::NoEntry) => Ok(()),
    Err(e) => Err(e.to_string()),
  }
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      get_auth_token,
      set_auth_token,
      clear_auth_token
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
