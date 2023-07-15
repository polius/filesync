class User {
  _id;
  _name;
  _peer;
  _remotePeers = {};
  _isHost = room_id.length == 0;
  _files = {};

  constructor(name) {
    this._name = name
  }

  get id() {
    return this._id
  }

  get isHost() {
    return this._isHost
  }

  get files() {
    return this._files
  }

  async init(peer_id = null) {
    await new Promise((resolve) => {
      // Create a new Peer instance
      this._peer = new Peer(peer_id);

      // Emitted when a connection to the PeerServer is established.
      this._peer.on('open', (id) => this._handleOpen(id, resolve));

      // Emitted when a new data connection is established from a remote peer.
      this._peer.on('connection', (conn) => conn.on('open', () => this._handleConnection(conn)));

      // Errors on the peer are almost always fatal and will destroy the peer.
      this._peer.on('error', (err) => this._handleError(err));
    })
  }

  async connect(peer_id) {
    await new Promise((resolve) => {
      // Establish a connection with the target peer.
      const conn = this._peer.connect(peer_id);

      // Emitted when the connection is established and ready-to-use.
      conn.on('open', () => this._handleConnection(conn, resolve));
    })
  }

  // Emitted when a connection to the PeerServer is established. 
  _handleOpen(id, resolve) {
    // console.log('My user peer ID is', id)
    this._id = id
    resolve()
  }

  // Add a file to be transferred to all peers
  async addFile(file) {
    // Parse file
    const fileData = {"_id": self.crypto.randomUUID(), "_type": 'send', "_name": file.name, "_md5": CryptoJS.MD5(file).toString(), "_size": file.size, "_file": file, "_owner_id": this._id, "_owner_name": nickname.value};

    // Create file instance
    const f = new File(fileData);

    // Init peer connection
    await f.init()

    // Add file to the current user
    this._files[f.id] = {"file": f, "origin": null}

    // Send file to all remote peers
    let data = {"id": f.id, "name": f.name, "size": f.size, "md5": f.md5, "owner_id": f.owner_id, "owner_name": f.owner_name, "peer": f.peer}
    for (let peer of Object.values(this._remotePeers)) {
      if ('conn' in peer) peer.conn.send({"webrtc-file": data})
    }

    // Add file to the list
    this._addFileUI(f)
  }

  // Download a file shared by another peer
  downloadFile(fileId) {
    this._files[fileId].origin.send({'webrtc-file-accept': fileId})
  }

  // Reject a file
  rejectFile(fileId) {
    // Reject the file transfer
    this._files[fileId].file.reject()

    // Sender
    if (this.files[fileId].file.owner_id == this._id) {
      // Notify all peers
      for (let p of Object.values(this._remotePeers)) {
        if (p.conn !== undefined) p.conn.send({'webrtc-file-reject': fileId})
      }
      // Update UI
      document.getElementById(`file-${fileId}-reject`).style.display = 'none'
      document.getElementById(`file-${fileId}-icon-loading`).style.display = 'none'
      document.getElementById(`file-${fileId}-icon-failed`).style.display = 'block'
      document.getElementById(`file-${fileId}-error`).innerHTML = 'The file transfer has been rejected.'
    }
    // Receiver
    else {
      // Notify the sender
      this._files[fileId].origin.send({'webrtc-file-reject': fileId})

      // Update UI
      document.getElementById(`file-${fileId}-reject`).style.display = 'none'
      document.getElementById(`file-${fileId}-icon-loading`).style.display = 'none'
      document.getElementById(`file-${fileId}-icon-failed`).style.display = 'block'
      document.getElementById(`file-${fileId}-error`).innerHTML = 'You stopped the file transfer.'
    }
  }

  // Emitted when the connection is established and ready-to-use. 
  _handleConnection(conn, resolve) {
    // console.log('Received connection from', conn.peer)

    // Emitted when data is received from the remote peer. 
    conn.on('data', (data) => this._handleData(conn, data));

    // Emitted when either you or the remote peer closes the data connection.
    conn.on('close', () => this._handleClose(conn));

    // Emitted when there is an unexpected error in the data connection.
    conn.on('error', (err) => this._handleError(err));

    // Send credentials to the host peer
    if (conn.peer == room_id) {
      this._remotePeers[conn.peer] = {"conn": conn}
      conn.send({"webrtc-auth": {"nickname": nickname.value, "password": CryptoJS.SHA3(password.value).toString(CryptoJS.enc.Hex)}})
    }
    // Store current peer connection (Remote peers)
    if (room_id.length != 0) {
      this._remotePeers[conn.peer]['conn'] = conn
    }

    // Resolve the promise to indicate the event is finished.
    if (resolve !== undefined) resolve()
  }

  // Emitted when data is received from the remote peer.
  async _handleData(conn, data) {
    // console.log("Received data from", conn.peer, data)

    if (this._isHost && 'webrtc-auth' in data) {
      if (password.value.length != 0 && CryptoJS.SHA3(password.value).toString(CryptoJS.enc.Hex) != data['webrtc-auth']['password']) {
        // Close connection (invalid password)
        conn.close()
      }
      else if (data['webrtc-auth']['nickname'] == nickname.value || Object.values(this._remotePeers).find(x => x.nickname == data['webrtc-auth']['nickname']) !== undefined) {
        // Close connection (nickname already exists)
        conn.close()
      }
      else {
        // Add peer to the peers list
        this._remotePeers[conn.peer] = {"nickname": data['webrtc-auth']['nickname'], "conn": conn}

        // Show peer connected status
        transfer_status_wait.style.display = 'none'
        transfer_status_ok.style.display = 'block'
        transfer_select_file.classList.remove('disabled')

        // Show UI new peer user
        let li = document.createElement('li')
        li.setAttribute('id', `user-${data['webrtc-auth']['nickname']}`)
        li.setAttribute('class', 'list-group-item')
        li.innerHTML = `
          <span title="User">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#198754" class="bi bi-lightning-charge-fill" viewBox="0 0 16 16" style="margin-bottom:5px">
              <path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09z"/>
            </svg>
          </span>
          ${data['webrtc-auth']['nickname']}
        `
        transfer_users.appendChild(li)

        // Update the number of users in the list
        transfer_users_number.innerHTML = ` (${transfer_users.querySelectorAll('li').length})`

        // Notify all peers
        let peers_list = Object.entries(this._remotePeers).map(([k, v]) => ({"id": k, "nickname": v.nickname}))
        peers_list.unshift({"id": this._id, "nickname": nickname.value })
        for (let p of Object.values(this._remotePeers)) {
          if (p.conn != null) p.conn.send({'webrtc-peers': peers_list})
        }
      }
    }
    else if (!this._isHost && 'webrtc-peers' in data) {
      // Show transfer page
      home.style.display = 'none'
      transfer.style.display = 'block'
      transfer_url.innerHTML = transfer_url.href = 'https://filesync.app/' + conn.peer
      transfer_status_wait.style.display = 'none'
      transfer_status_ok.style.display = 'block'
      transfer_select_file.style.display = 'block'
      transfer_select_file.classList.remove('disabled')

      // Build user's list
      for (let p of data['webrtc-peers']) {
        // If peer is the host
        if (p.id == room_id) {
          transfer_host_user.innerHTML = p.nickname
          this._remotePeers[p.id] = {...this._remotePeers[p.id], "nickname": p.nickname}
        }
        // If peer is not in the peers list
        else if (!(p.id in this._remotePeers)) {
          // Add Peer Frontend
          let li = document.createElement('li')
          li.setAttribute('id', `user-${p.nickname}`)
          li.setAttribute('class', 'list-group-item')
          li.innerHTML = `
            <span title="User">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#198754" class="bi bi-lightning-charge-fill" viewBox="0 0 16 16" style="margin-bottom:5px">
                <path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09z"/>
              </svg>
            </span>
            ${p.id == this._id ? p.nickname + ' (You)' : p.nickname}
          `
          transfer_users.appendChild(li)

          // Update the number of users in the list
          transfer_users_number.innerHTML = ` (${transfer_users.querySelectorAll('li').length})`

          // Add Peer Backend
          this._remotePeers[p.id] = {"nickname": p.nickname}

          // Connect New Peer if it's not the self peer and it's not the host
          if (p.id != this._id && p.id != room_id) {
            await this.connect(p.id)
          }
        }
      }
    }
    else if ('webrtc-file' in data && conn.peer in this._remotePeers) {
      this._onFileReceive(conn, data['webrtc-file'])
    }
    else if ('webrtc-file-accept' in data && conn.peer in this._remotePeers) {
      this._onFileAccept(conn, data['webrtc-file-accept'])
    }
    else if ('webrtc-file-progress' in data && conn.peer in this._remotePeers) {
      this._onFileProgress(conn, data['webrtc-file-progress'])
    }
    else if ('webrtc-file-reject' in data && conn.peer in this._remotePeers) {
      this._onFileReject(data['webrtc-file-reject'])
    }
    else conn.close()
  }

  // Emitted when either you or the remote peer closes the data connection.
  _handleClose(conn) {
    // console.log('Closed connection from', conn.peer)

    // The closed connection is the host
    if (conn.peer == room_id) {
      // Invalid password
      if (home.style.display == 'block') {
        error.innerHTML = "This nickname already exists or the password is invalid."
        error.style.display = 'block'
        home_button.disabled = false
        home_button_loading.style.display = 'none'
      }
      // The host user has been disconnected
      else if (transfer.style.display == 'block') {
        transfer_status_ok.style.display = 'none'
        transfer_status_error.style.display = 'block'
        transfer_share_room.style.display = 'none'
        transfer_select_file.classList.add('disabled')
        document.getElementById('host').remove()
      }
    }
    // Host user handling
    else if (conn.peer in this._remotePeers) {
      // Remove user from frontend
      document.getElementById('user-' + this._remotePeers[conn.peer].nickname).remove()
    }
    // Remove peer user
    delete this._remotePeers[conn.peer]

    // If no peers, disable the Send File button
    if (Object.keys(this._remotePeers).length == 0) {
      transfer_select_file.classList.add('disabled')
      transfer_status_ok.style.display = 'none'
      transfer_status_wait.style.display = 'block'
    }

    // Update the number of users in the list
    transfer_users_number.innerHTML = ` (${transfer_users.querySelectorAll('li').length})`
  }

  // Emitted when there is an unexpected error in the data connection.
  _handleError(err) {
    console.error('Connection error: ' + err)
    if (home.style.display == 'block') {
      error.innerHTML = !peerjs.util.supports.data ? 'FileSync can not work with this browser.' : "This room does no longer exist."
      error.style.display = 'block'
      home_button.disabled = false
      home_button_loading.style.display = 'none'
    }
    else setTimeout(() => this.init(this._id), 1000);
  }

  async _onFileReceive(conn, file) {
    // Create file instance with received data
    const fileData = {"_id": file.id, "_type": 'receive', "_name": file.name, "_md5": file.md5, "_size": file.size, "_owner_id": file.owner_id, "_owner_name": file.owner_name, "_conn": {"user": conn}};

    // Create file instance
    const f = new File(fileData)

    // Init peer connection
    await f.init()

    // Connect to file owner
    await f.connect(file.peer, {"origin": this._id})

    // Add file to the current user
    this._files[f.id] = {"file": f, "origin": conn}

    // Add file to the list
    this._addFileUI(f)
  }

  _onFileAccept(conn, fileId) {
    this._files[fileId].file.transfer(conn.peer)
  }

  _onFileProgress(conn, data) {
    // Track data transfer progress
    this._files[data.file].file.progress = {"peer": conn.peer, "progress": data.progress}

    // Calculate overall progress
    let raw_progress = {"peers": 0, "progress": 0}
    for (let p of Object.values(this._files[data.file].file.remotePeers)) {
      if (p.conn.open) {
        raw_progress.peers += 1
        raw_progress.progress += p.progress
      }
    }

    // console.log(raw_progress)
    const overall_progress = raw_progress.peers == 0 ? 0 : Math.floor(raw_progress.progress / raw_progress.peers)

    // Update UI: Show the overall progress
    document.getElementById(`file-${data.file}-progress`).innerHTML = `${overall_progress}% |`

    if (overall_progress == 100) {
      // Update UI: Mark file transfer as succeeded
      document.getElementById(`file-${data.file}-reject`).style.display = 'none'
      document.getElementById(`file-${data.file}-icon-loading`).style.display = 'none'
      document.getElementById(`file-${data.file}-icon-success`).style.display = 'block'

      // Remove file reference from memory
      delete this._files[data.file]
    }
  }

  _onFileReject(fileId) {
    // Sender
    if (this.files[fileId].file.owner_id == this._id) {
      // Check if all peers have the active rejected. If that's the case then update UI
      const all_peers_closed = Object.values(this._files[fileId].file.remotePeers).every(x => x.conn.open === false)

      if (all_peers_closed) {
        document.getElementById(`file-${fileId}-reject`).style.display = 'none'
        document.getElementById(`file-${fileId}-icon-loading`).style.display = 'none'
        document.getElementById(`file-${fileId}-icon-failed`).style.display = 'block'
        document.getElementById(`file-${fileId}-error`).innerHTML = 'All users rejected your file.'
      }
    }
    // Receiver
    else {
      document.getElementById(`file-${fileId}-reject`).style.display = 'none'
      document.getElementById(`file-${fileId}-download`).style.display = 'none'
      document.getElementById(`file-${fileId}-icon-loading`).style.display = 'none'
      document.getElementById(`file-${fileId}-icon-failed`).style.display = 'block'
      document.getElementById(`file-${fileId}-error`).innerHTML = 'The file has been rejected by the owner.'
    }
  }

  _addFileUI(file) {
    // Add file to the list
    transfer_no_files.remove()
    let li = document.createElement('li')
    li.setAttribute('id', `file-${this._id}`)
    li.setAttribute('class', 'list-group-item')
  
    li.innerHTML = `
      <div class="row align-items-center">
        <div class="col-auto" style="padding-right: 0">
          <div id="file-${file.id}-icon-loading" title="${file.owner_id == this._id ? 'Uploading file': 'Downloading file'}" class="col-auto spinner-border" style="margin-right: 12px; color: #0d6efd; width: 1.4rem; height: 1.4rem; --bs-spinner-border-width: 0.15em; margin-top:3px; display: none"></div>
          <div id="file-${file.id}-icon-success" title="${file.owner_id == this._id ? 'File uploaded': 'File downloaded'}" style="margin-right: 12px; display: none">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#198754" class="bi bi-check-circle-fill" viewBox="0 0 16 16">
              <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
            </svg>
          </div>
          <div id="file-${file.id}-icon-failed" title="Failed" style="margin-right: 12px; display: none">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#dc3545" class="bi bi-x-circle-fill" viewBox="0 0 16 16">
              <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
            </svg>
          </div>
        </div>
  
        <div class="col d-flex flex-column" style="overflow-x: hidden; padding-left:0px;">
          <div style="margin-bottom: 5px; font-size: 1rem; font-weight: 500; overflow-x: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-arrow-up-short" viewBox="0 0 16 16"; style="margin-top:-3px; margin-right:-3px; margin-left:-5px; display: ${file.owner_id == this._id ? 'block-inline' : 'none'}">
            <path fill-rule="evenodd" d="M8 12a.5.5 0 0 0 .5-.5V5.707l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L7.5 5.707V11.5a.5.5 0 0 0 .5.5z"/>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-arrow-down-short" viewBox="0 0 16 16" style="margin-top:-3px; margin-right:-3px; margin-left:-5px; display: ${file.owner_id == this._id ? 'none' : 'block-inline'}">
            <path fill-rule="evenodd" d="M8 4a.5.5 0 0 1 .5.5v5.793l2.146-2.147a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L7.5 10.293V4.5A.5.5 0 0 1 8 4z"/>
          </svg>
          ${file.name}</div>
          <div style="color: #636979; font-size: .9rem; font-weight: 500; overflow-x: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left"><span id="file-${file.id}-progress" style="margin-right:3px"></span>${parseBytes(file.size)} | Sent by ${file.owner_id == this._id ? `${file.owner_name} (You)` : file.owner_name }</div>
          <div id="file-${file.id}-error" style="color: #dc3545; font-size: .9rem; font-weight: 500; overflow-x: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; margin-top:5px"></div>
        </div>

        <div id="file-${file.id}-reject" onclick="rejectFile('${file.id}')" class="col-auto text-end" title="Reject file" style="cursor: pointer; display: ${file.owner_id == this._id ? 'block-inline' : 'none'}">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="#dc3545" class="bi bi-x-circle" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </div>
        <div id="file-${file.id}-download" onclick="downloadFile('${file.id}')" class="col-auto text-end" title="Download file" style="cursor: pointer; display: ${file.owner_id == this._id ? 'none' : 'block-inline'}">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="#0d6efd" class="bi bi-arrow-down-circle" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8zm15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v5.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V4.5z"/>
          </svg>
        </div>
      </div>
    `
    transfer_files.appendChild(li)

    // Update the number of files in the list
    transfer_files_number.innerHTML = ` (${transfer_files.querySelectorAll('li').length})`
  }
}