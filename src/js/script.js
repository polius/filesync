// Store previous step (for about)
var previousStep = null

// Get current row_id
const room_id = window.location.pathname.substring(1)

// Get all components
const about = document.getElementById('about')
const home = document.getElementById('home')
const transfer = document.getElementById('transfer')

// Top bar
const theme_text = document.getElementById('theme-text')
const about_text = document.getElementById('about-text')

// About UI
const comic_img = document.getElementById('comic-img')

// Home UI
const nickname = document.getElementById('nickname')
const password = document.getElementById('password')
const error = document.getElementById('error')
const home_button = document.getElementById('home-button')
const home_button_text = document.getElementById('home-button-text')
const home_button_loading = document.getElementById('home-button-loading')

// Transfer UI
const transfer_url = document.getElementById('transfer-url')
const transfer_copy = document.getElementById('transfer-copy-url')

const transfer_status_wait = document.getElementById('transfer-status-wait')
const transfer_status_ok = document.getElementById('transfer-status-ok')
const transfer_status_error = document.getElementById('transfer-status-error')
const transfer_share_room = document.getElementById('transfer-share-room')

const transfer_users = document.getElementById('users')
const transfer_users_number = document.getElementById('users-number')
const transfer_host_user = document.getElementById('host-user')

const transfer_files = document.getElementById('transfer-files')
const transfer_files_number = document.getElementById('files-number')
const transfer_no_files = document.getElementById('transfer-no-files')
const transfer_select_file = document.getElementById('transfer-select-file')

// Store current user
var user;

// QR Code
var qr = new QRious({
  element: document.getElementById('qrcode'),
  background: 'white',
  foreground: 'black',
  level: 'H',
})

// Get theme mode
if (window.localStorage.getItem('mode') == 'dark') {
  theme_text.innerHTML = 'Dark'
  comic_img.src = "assets/comic-dark.png"
}

// Change button name for invited peers
if (room_id.length > 0) home_button_text.innerHTML = 'Join room'

// Clean inputs
nickname.value = password.value = ''
nickname.focus()

// Theme
function themeClick() {
  if (theme_text.innerHTML == 'Dark') {
    theme_text.innerHTML = 'Light'
    document.documentElement.classList.remove("dark")
    document.documentElement.classList.add("light")
    document.documentElement.setAttribute('data-bs-theme', 'light')
    window.localStorage.setItem('mode', 'light')
    comic_img.src = "assets/comic.png"
  }
  else if (theme_text.innerHTML == 'Light') {
    theme_text.innerHTML = 'Dark'
    document.documentElement.classList.remove("light")
    document.documentElement.classList.add("dark")
    document.documentElement.setAttribute('data-bs-theme', 'dark')
    window.localStorage.setItem('mode', 'dark')
    comic_img.src = "assets/comic-dark.png"
  }
}

// About
function aboutClick() {
  if (about_text.innerHTML == 'About') {
    const currentStep = [home, transfer].find(x => x.style.display != 'none')
    previousStep = currentStep
    currentStep.style.display = 'none'
    about.style.display = 'block'
    about_text.innerHTML = 'Go back'
  }
  else {
    about.style.display = 'none'
    about_text.innerHTML = 'About'
    previousStep.style.display = 'block'
  }
}

// Show / Hide password
function togglePasswordVisibility() {
  var password_button_show = document.getElementById("password-button-show")
  var password_button_hide = document.getElementById("password-button-hide")
  if (password.type === "password") {
    password.type = "text"
    password_button_show.style.display = 'block'
    password_button_hide.style.display = 'none'
  } else {
    password.type = "password"
    password_button_show.style.display = 'none'
    password_button_hide.style.display = 'block'
  }
  password.focus()
}

// Copy Room url
function copyURL() {
  navigator.clipboard.writeText(transfer_url.href)
  transfer_copy.innerHTML = 'URL Copied!'
  setTimeout(() => {
    transfer_copy.innerHTML = 'Copy URL'
  }, 1000)
}

// Show modal with the QR code
function showQR() {
  qr.set({
    value: transfer_url.href,
    size: Math.min(window.innerWidth * 0.8, 250),
  });
}

// Share room url with Whatsapp
function shareWhatsapp() {
  window.open(encodeURI('https://wa.me/?text=' + transfer_url.href), '_blank')
}

// Share room url with Telegram
function shareTelegram() {
  window.open(encodeURI('tg://msg?text=' + transfer_url.href), '_blank')
}

// Use Cryptex
function openCryptex() {
  window.open(`https://cryptex.ninja?m=${encodeURIComponent(transfer_url.href)}`, '_blank')
}

// Create / Join room
async function homeButtonClick() {
  if (nickname.value.length == 0) {
    error.innerHTML = "The nickname cannot be empty."
    error.style.display = 'block'
    nickname.focus()
    return
  }
  home_button.disabled = true
  home_button_loading.style.display = 'inline-block'

  // Create current user
  user = new User(nickname.value)

  // Init peer connection
  await user.init()

  // Host peer
  if (user.isHost) {
    home.style.display = 'none'
    transfer.style.display = 'block'
    transfer_url.innerHTML = transfer_url.href = 'https://filesync.app/' + user.id
    transfer_select_file.style.display = 'block'
    transfer_host_user.innerHTML = nickname.value + ' (You)'
  }
  // Remote peer
  else await user.connect(room_id)
}

// Send File
async function sendFile(event) {
  for (let data of event.files) user.addFile(data)
}

// Download File
function downloadFile(id) {
  // Update UI: Remove Download button and add loading icon
  document.getElementById(`file-${id}-download`).style.display = 'none'
  document.getElementById(`file-${id}-reject`).style.display = 'block'
  document.getElementById(`file-${id}-icon-loading`).style.display = 'block'
  document.getElementById(`file-${id}-progress`).innerHTML = '0% |'

  // Request file to be download it
  user.downloadFile(id)
}

// Reject File
function rejectFile(id) {
  user.rejectFile(id)
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