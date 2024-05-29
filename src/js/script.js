// Room ID
const room_id = window.location.pathname.substring(1) // window.location.search ? window.location.search.substring(4) : ''

// Store current user
var user;

// TOP BAR
const theme_text = document.getElementById('theme-text')
const about_text = document.getElementById('about-text')

// ABOUT
const about_div = document.getElementById('about-div')
const comic_img = document.getElementById('comic-img')

// ERROR
const error_div = document.getElementById('error-div')
const error_message = document.getElementById('error-message')

// PASSWORD
const password_div = document.getElementById('password-div')
const password_alert = document.getElementById('password-alert')
const password_input = document.getElementById('password-input')
const password_hide = document.getElementById('password-hide')
const password_show = document.getElementById('password-show')
const password_error = document.getElementById('password-error')
const password_submit = document.getElementById('password-submit')
const password_loading = document.getElementById('password-loading')

// CONNECT
const connect_div = document.getElementById('connect-div')

// TRANSFER
const transfer_div = document.getElementById('transfer-div')

const transfer_qr_code = document.getElementById('transfer-qr-code')
const transfer_status_protected = document.getElementById('transfer-status-protected')
const transfer_status_wait = document.getElementById('transfer-status-wait')
const transfer_status_success = document.getElementById('transfer-status-success')

const transfer_url_value = document.getElementById('transfer-url-value')
const transfer_url_copy = document.getElementById('transfer-url-copy')
const transfer_url_success = document.getElementById('transfer-url-success')

const transfer_select_file = document.getElementById('transfer-select-file')
const transfer_select_file_input = document.getElementById('transfer-select-file-input')
const transfer_add_password = document.getElementById('transfer-add-password')

const transfer_users_div = document.getElementById('transfer-users-div')
const transfer_users_count = document.getElementById('transfer-users-count')
const transfer_users_list = document.getElementById('transfer-users-list')
const transfer_users_list_host = document.getElementById('transfer-users-list-host')
const transfer_users_list_host_name = document.getElementById('transfer-users-list-host-name')

const transfer_files_div = document.getElementById('transfer-files-div')
const transfer_files_count = document.getElementById('transfer-files-count')
const transfer_files_download = document.getElementById('transfer-files-download')
const transfer_files_list = document.getElementById('transfer-files-list')
const transfer_files_list_empty = document.getElementById('transfer-files-list-empty')

// PASSWORD MODAL
const password_modal = document.getElementById('password-modal')
const password_modal_value = document.getElementById('password-modal-value')

// NAME MODAL
const name_modal = document.getElementById('name-modal')
const name_modal_value = document.getElementById('name-modal-value')
const name_modal_error = document.getElementById('name-modal-error')

// FILE MODAL
const file_modal = document.getElementById('file-modal')
const file_modal_table = document.getElementById('file-modal-table')
const file_modal_table_empty = document.getElementById('file-modal-table-empty')
const file_modal_refresh = document.getElementById('file-modal-refresh')

// DOWNLOAD MODAL
const download_modal = document.getElementById('download-modal')
const download_modal_value = document.getElementById('download-modal-value')
const download_modal_active = document.getElementById('download-modal-active')
const download_modal_success = document.getElementById('download-modal-success')
const download_modal_error = document.getElementById('download-modal-error')
const download_modal_cancel = document.getElementById('download-modal-cancel')
const download_modal_cancel_spinner = document.getElementById('download-modal-cancel-spinner')
const download_modal_close = document.getElementById('download-modal-close')

// NOTIFICATION
const notification_modal = document.getElementById('notification-modal')
const notification_modal_value = document.getElementById('notification-modal-value')

// QR Code
var qr = new QRious({
  element: document.getElementById('transfer-qr-code'),
  background: 'transparent',
  size: 220,
  foreground: '#adb5db',
  level: 'H',
})

// Get theme mode
if (window.localStorage.getItem('mode') == 'light') {
  theme_text.innerHTML = 'Light'
  comic_img.src = "assets/comic.png"
  qr.set({foreground: '#212529'});
}

// On Load
async function onLoad() {
  // Create current user
  user = new User()

  // Host
  if (room_id.length == 0) {
    // Generate Room ID
    const new_room_id = generateRoomID()

    // Init UI Components
    transfer_div.style.display = 'block'
    transfer_url_value.innerHTML = `${window.location.origin}/${new_room_id}` // `${window.location.origin}${window.location.pathname}?id=${new_room_id}`
    transfer_users_list_host_name.innerHTML = user.name + ' (You)'
    transfer_users_count.innerHTML = ' (1)'
    transfer_add_password.style.display = 'block';
    qr.set({value: transfer_url_value.innerHTML});

    // Init peer connection
    await user.init(new_room_id)
  }
  // Peer
  else {
    // Init UI Componente
    connect_div.style.display = 'block'
    transfer_url_value.innerHTML = `${window.location.origin}/${room_id}` // `${window.location.origin}${window.location.pathname}?id=${room_id}`
    qr.set({value: transfer_url_value.innerHTML});

    // Init peer connection
    await user.init()

    // Connect to the room
    await user.connect(room_id)
  }
}

// Theme
function themeClick() {
  if (theme_text.innerHTML == 'Dark') {
    theme_text.innerHTML = 'Light'
    document.documentElement.classList.remove("dark")
    document.documentElement.classList.add("light")
    document.documentElement.setAttribute('data-bs-theme', 'light')
    window.localStorage.setItem('mode', 'light')
    comic_img.src = "assets/comic.png"
    qr.set({foreground: '#212529'});
  }
  else if (theme_text.innerHTML == 'Light') {
    theme_text.innerHTML = 'Dark'
    document.documentElement.classList.remove("light")
    document.documentElement.classList.add("dark")
    document.documentElement.setAttribute('data-bs-theme', 'dark')
    window.localStorage.setItem('mode', 'dark')
    comic_img.src = "assets/comic-dark.png"
    qr.set({foreground: '#adb5db'});
  }
}

// About
function aboutClick() {
  if (about_text.innerHTML == 'About') {
    transfer_div.style.display = 'none'
    about_div.style.display = 'block'
    about_text.innerHTML = 'Go back'
  }
  else {
    about_div.style.display = 'none'
    about_text.innerHTML = 'About'
    transfer_div.style.display = 'block'
  }
}

function addPassword() {
  const modal = new bootstrap.Modal(password_modal)
  modal.show()
}

// Show / Hide password
function togglePasswordVisibility(input_name, button_show_name, button_hide_name) {
  var password_input = document.getElementById(input_name)
  var password_button_show = document.getElementById(button_show_name)
  var password_button_hide = document.getElementById(button_hide_name)
  if (password_input.type === "password") {
    password_input.type = "text"
    password_button_show.style.display = 'block'
    password_button_hide.style.display = 'none'
  } else {
    password_input.type = "password"
    password_button_show.style.display = 'none'
    password_button_hide.style.display = 'block'
  }
  password_input.focus()
}

// Confirm change password
function addPasswordSubmit() {
  user.password = password_modal_value.value.trim()
  const modal = bootstrap.Modal.getInstance(password_modal);
  modal.hide()
  transfer_status_protected.style.display = user.password.length == 0 ? 'none' : 'inline-block'
}

function connectWithPassword() {
  if (password_input.value.trim().length == 0) {
    password_error.style.display = 'block'
  }
  else {
    user.password = password_input.value
    password_error.style.display = 'none'
    password_submit.setAttribute("disabled", "")
    password_loading.style.display = 'inline-block'
    user.connect(room_id)
  }
}

// Change name
function changeName() {
  name_modal_value.value = ''
  name_modal_error.style.display = 'none'

  const modal = new bootstrap.Modal(name_modal)
  modal.show()
}

function changeNameSubmit() {
  // Update name
  user.changeName(name_modal_value.value.trim())
}

// Copy Room url
function copyURL() {
  const url = transfer_url_value.innerHTML;
  navigator.clipboard.writeText(url)

  const modal = new bootstrap.Modal(notification_modal)
  notification_modal_value.innerHTML = "URL copied."
  transfer_url_copy.style.display = 'none'
  transfer_url_success.style.display = 'flex'
  modal.show()

  setTimeout(() => {
    transfer_url_success.style.display = 'none'
    transfer_url_copy.style.display = 'flex'
    modal.hide()
  }, 1000)
}

// Send File
function sendFiles(event) {
  user.addFiles(event.files)
}

// Remove file
function removeFile(fileId) {
  user.removeFile(fileId)
}

// Download File
function downloadFile(id) {
  user.downloadFile(id)
}

// Abort File (Stop file download)
function abortFile(fileId) {
  user.abortFile(fileId)
}

// See details
function showFileDetails(fileId) {
  user.showFileDetails(fileId)
}

// Download all
function downloadAll() {
  user.downloadAll()
}

// Cancel download all
function cancelDownloadAll() {
  user.downloadAllCancel()
}

// Function to parse bytes
function parseBytes(bytes) {
  const units = ['bytes', 'KB', 'MB', 'GB', 'TB']
  const base = 1024
  if (bytes === 0) {
    return '0 bytes'
  }
  const exponent = Math.floor(Math.log(bytes) / Math.log(base))
  const value = (bytes / Math.pow(base, exponent)).toFixed(2)
  return `${value} ${units[exponent]}`
}

// Function to generate a random string in the format XXX-XXXX-XXX.
function generateRoomID() {
  const length = 10
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const random = crypto.getRandomValues(new Uint8Array(length));
  let room_id = "";
  for (let i = 0; i < length; i++) {
    room_id += alphabet[random[i] % alphabet.length];
  }
  return `${room_id.slice(0, 3)}-${room_id.slice(3, 7)}-${room_id.slice(7, 10)}`;
}

// On document loaded, execute onLoad() method.
(() => onLoad())();

// Display a confirmation dialog when the user attempts to refresh or navigate away from the page.
window.addEventListener("beforeunload", (event) => {
  event.preventDefault();
});

// Focus the password input after the fade animation
password_modal.addEventListener('shown.bs.modal', () => {
  password_modal_value.focus()
});

// Focus the name input after the fade animation
name_modal.addEventListener('shown.bs.modal', () => {
  name_modal_value.focus()
});