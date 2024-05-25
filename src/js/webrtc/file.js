class File {
  // File
  _id;
  _name;
  _size;
  _content;
  _owner_id;
  _owner_name;

  // Send
  _remotePeers = {};

  // Receive
  _peer;
  _chunks = [];
  _transferred = 0;
  _zip = false;
  _in_progress = false;
  _aborted = false;
  _removed = false

  constructor(file) {
    this._id = file.id
    this._name = file.name
    this._size = file.size
    this._content = file.content
    this._owner_id = file.owner_id
    this._owner_name = file.owner_name
  }

  get file() {
    return {"id": this._id, "name": this._name, "size": this._size, "owner_id": this._owner_id, "owner_name": this._owner_name}
  }

  get id() {
    return this._id;
  }

  get name() {
    return this._name
  }

  get size() {
    return this._size
  }

  get owner_id() {
    return this._owner_id
  }

  get owner_name() {
    return this._owner_name
  }

  get peer() {
    return this._peer
  }

  get remotePeers() {
    return this._remotePeers
  }

  get details() {
    return Object.values(this._remotePeers).reduce((acc, p) => {
      acc[p.user_id] = {
        user_name: p.user_name,
        progress: p.progress,
        aborted: p.aborted,
      };
      return acc;
    }, {});
  }

  get in_progress() {
    return this._in_progress
  }

  get aborted() {
    return this._aborted
  }

  get removed() {
    return this._removed
  }

  set removed(value) {
    return this._removed = value
  }

  get transferred() {
    return this._transferred
  }

  get chunks() {
    return this._chunks
  }

  set chunks(value) {
    this._chunks = value
  }

  set owner_name(value) {
    this._owner_name = value
  }

  set zip(value) {
    this._zip = value
  }

  async init(peer_id) {
    await new Promise((resolve) => {
      // Create a new Peer instance
      const peer = new Peer(crypto.randomUUID(), {
        host: "peer.filesync.app",
        port: 443,
        path: "/"
      });

      // Emitted when a connection to the PeerServer is established.
      peer.on('open', (id) => this._handleOpen(id, resolve));

      // Emitted when a new data connection is established from a remote peer.
      peer.on('connection', (conn) => conn.on('open', () => this._handleConnection(conn)));

      // Errors on the peer are almost always fatal and will destroy the peer.
      peer.on('error', (err) => this._handleError(err));

      // Store peer (Receiver)
      if (peer_id === undefined) this._peer = peer
      // Store peer (Sender)
      else this._remotePeers[peer_id].peer = peer
    })
  }

  async connect(peer_id) {
    // Init new peer
    await this.init(peer_id)

    // Establish a connection with the target peer.
    await new Promise((resolve) => {
      const conn = this._remotePeers[peer_id].peer.connect(peer_id);

      // Emitted when the connection is established and ready-to-use.
      conn.on('open', () => this._handleConnection(conn, resolve));
    })
  }

  async transfer(data) {
    // Update UI
    document.getElementById(`file-${this._id}-error`).style.display = 'none'
    document.getElementById(`file-${this._id}-icon-success`).style.display = 'none'
    document.getElementById(`file-${this._id}-icon-loading`).style.display = 'block'
    document.getElementById(`file-${this._id}-progress`).innerHTML = '0% | '

    // Store peer data
    this._remotePeers[data.peer_id] = {"user_id": data.requester_id, "user_name": data.requester_name, "peer": null, "conn": null, "online": true, "interval": setInterval(() => this._isAlive(conn.peer), 1000), "progress": 0, "aborted": false}

    // Connect to peer_id
    await this.connect(data.peer_id)

    // Get connection
    const conn = this._remotePeers[data.peer_id].conn

    // Define vars for chunk processing
    const chunkSize = 1024**2 // 1 MB
    let offset = 0

    // Recursive function to process each chunk
    const processChunk = async () => {
      // Get the current chunk based on the offset and chunk size
      const chunk = this._content.slice(offset, offset + chunkSize)
      const isLastChunk = offset + chunkSize >= this._size

      // Check if the connection to the remote peer is open
      if (conn.peerConnection != null && conn.peerConnection.iceConnectionState != 'disconnected') {
        // const encryptedChunk = await this._encrypt(chunk, `PASSWORD_VALUE`)
        conn.send({"webrtc-file-transfer": {"file": chunk, "transferred": chunk.size, "last": isLastChunk}})
      }

      // If it's not the last chunk, process the next one
      if (data.peer_id in this._remotePeers && !isLastChunk) {
        offset += chunkSize
        await processChunk()
      }
    }
    // Start processing the chunks
    processChunk()
  }

  abort() {
    this._aborted = true
  }

  remove() {
    this._aborted = true
    this._removed = true
  }

  // Emitted when a connection to the PeerServer is established. 
  _handleOpen(id, resolve) {
    // console.log('My file peer ID is', id)
    resolve()
  }

  // Emitted when the connection is established and ready-to-use. 
  _handleConnection(conn, resolve) {
    // console.log('Received file connection from', conn.peer)

    // Emitted when data is received from the remote peer. 
    conn.on('data', (data) => this._handleData(conn, data));

    // Emitted when either you or the remote peer closes the data connection.
    conn.on('close', () => this._handleClose(conn));

    // Emitted when there is an unexpected error in the data connection.
    conn.on('error', (err) => this._handleError(err));

    // Sender
    if (resolve !== undefined) {
      this._remotePeers[conn.peer].conn = conn
      resolve()
    }
    // Receiver
    else {
      this._chunks = []
      this._transferred = 0
      this._aborted = false
      this._in_progress = true
    }
  }

  // Check if file connection is alive.
  async _isAlive(peer_id) {
    if (this._remotePeers[peer_id].conn.peerConnection === null || this._remotePeers[peer_id].conn.peerConnection.iceConnectionState == 'disconnected') {
      clearInterval(this._remotePeers[peer_id].interval);
      if (this._remotePeers[peer_id].progress != 100) {
        this._remotePeers[peer_id].aborted = true
      }
      this._onFileProgress()
      this._remotePeers[peer_id].online = false
    }
  }

  // Emitted when data is received from the remote peer.
  async _handleData(conn, data) {
    if ("webrtc-file-transfer" in data) {
      this._onFileTransfer(conn, data['webrtc-file-transfer'])
    }
    else if ("webrtc-file-progress" in data) {
      this._onFileProgress(conn, data['webrtc-file-progress'])
    }
    else if ("webrtc-file-abort" in data) {
      this._onFileAborted(conn)
    }
  }

  async _onFileTransfer(conn, data) {
    // If it's aborted, do nothing. 
    if (this._aborted) {
      conn.send({"webrtc-file-abort": true})
      conn.close()
      this._peer.destroy()
      this._in_progress = false
      return
    }

    // Store file chunk
    // const decryptedChunk = await this._decrypt(data.file, `PASSWORD_VALUE`)
    this._chunks.push(data.file)
    this._transferred += data.transferred

    // Compute progress
    this._progress = Math.floor(this._transferred / this._size * 100)

    // Update Progress UI
    if (!this._zip) {
      document.getElementById(`file-${this._id}-progress`).innerHTML = `${this._progress}% | `
    }

    // Notify progress
    conn.send({"webrtc-file-progress": {"progress": this._progress}})

    // If it's the last chunk
    if (data.last) {
      if (!this._zip) {
        // Update UI
        document.getElementById(`file-${this._id}-download`).style.display = 'block'
        document.getElementById(`file-${this._id}-abort`).style.display = 'none'
        document.getElementById(`file-${this._id}-icon-loading`).style.display = 'none'
        document.getElementById(`file-${this._id}-icon-success`).style.display = 'block'

        // Create a new Blob from all file chunks
        const blob = new Blob(this._chunks);

        // Download file
        const downloadLink = document.createElement('a')
        downloadLink.href = URL.createObjectURL(blob)
        downloadLink.download = this._name
        downloadLink.click()

        // Clean data
        this._chunks = []
        this._transferred = 0
      }

      // Update internal parameters
      this._in_progress = false
      this._zip = false

      // Close connection
      conn.close()

      // Destroy current peer to free up resources
      this._peer.destroy()
    }
  }

  _onFileProgress(conn, data) {
    // Track data transfer progress
    if (data) {
      this._remotePeers[conn.peer].progress = data.progress
    }

    // Calculate overall progress
    const onlinePeers = Object.values(this._remotePeers).filter(x => x.online)
    const totalProgress = onlinePeers.reduce((sum, x) => sum + x.progress, 0)
    const overall_progress = onlinePeers.length == 0 ? 0 : Math.floor(totalProgress / onlinePeers.length)

    // Update UI: Show the overall progress
    document.getElementById(`file-${this._id}-progress`).innerHTML = `${overall_progress}% | `

    if (!this._aborted && onlinePeers.filter(x => !x.aborted).length == 0) {
      document.getElementById(`file-${this._id}-progress`).innerHTML = `${overall_progress}% | `
      document.getElementById(`file-${this._id}-icon-loading`).style.display = 'none'
      document.getElementById(`file-${this._id}-error`).style.display = 'block'
      document.getElementById(`file-${this._id}-error`).innerHTML = 'All users stopped the file transfer.'
    }
    else if (overall_progress == 100) {
      document.getElementById(`file-${this._id}-abort`).style.display = 'none'
      document.getElementById(`file-${this._id}-icon-loading`).style.display = 'none'
      document.getElementById(`file-${this._id}-icon-success`).style.display = 'block'
    }
  }

  _onFileAborted(conn) {
    this._remotePeers[conn.peer].aborted = true
    this._onFileProgress()
  }

  // Emitted when either you or the remote peer closes the data connection.
  _handleClose(conn) {
    // Sender
    if (conn.peer in this._remotePeers) {
      this._remotePeers[conn.peer].peer.destroy()
    }
  }

  // Emitted when there is an unexpected error in the data connection.
  _handleError(err) {
    console.error("An error occurred.", err)
  }

  // Function to encrypt a chunk of data with AES-GCM
  async _encrypt(chunk, key) {
    // Step 1: Encode the key
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);

    // Step 2: Generate the IV
    const ivBuffer = await crypto.subtle.digest('SHA-256', keyData);
    const iv = new Uint8Array(ivBuffer.slice(0, 12));

    // Step 3: Import the key data as a CryptoKey object
    const importedKey = await crypto.subtle.importKey('raw', keyData, { name: 'PBKDF2' }, false, ['deriveKey']);

    // Step 4: Derive a fixed-size key using a Key Derivation Function (KDF)
    const derivedKey = await crypto.subtle.deriveKey({name: 'PBKDF2', salt: new Uint8Array(ivBuffer), iterations: 100000, hash: 'SHA-256'}, importedKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);

    // Step 5: Convert the Blob chunk to an ArrayBuffer
    const arrayBuffer = await chunk.arrayBuffer();

    // Step 6: Encrypt the chunk with AES-GCM algorithm
    const encryptedData = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, derivedKey, arrayBuffer);

    // Step 7: Return the encrypted data as ArrayBuffer
    return encryptedData;
  }

  // Function to decrypt a chunk of encrypted data with AES-GCM
  async _decrypt(chunk, key) {
    // Step 1: Encode the key
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);

    // Step 2: Extract the IV and encrypted data
    const ivBuffer = await crypto.subtle.digest('SHA-256', keyData);
    const iv = new Uint8Array(ivBuffer.slice(0, 12));

    // Step 3: Import the key data as a CryptoKey object
    const importedKey = await crypto.subtle.importKey('raw', keyData, { name: 'PBKDF2' }, false, ['deriveKey']);

    // Step 4: Derive a fixed-size key using a Key Derivation Function (KDF)
    const derivedKey = await crypto.subtle.deriveKey({name: 'PBKDF2', salt: new Uint8Array(ivBuffer), iterations: 100000, hash: 'SHA-256'}, importedKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);

    // Step 5: Decrypt the encrypted data with AES-GCM algorithm
    const decryptedData = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, derivedKey, chunk);

    // Step 6: Convert the decrypted ArrayBuffer to a Blob
    const decryptedBlob = new Blob([decryptedData]);

    // Step 7: Return the decrypted data as Blob
    return decryptedBlob;
  }
}