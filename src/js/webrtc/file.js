class File {
  // Common
  _id;
  _type; // send | receive
  _name;
  _md5;
  _size;
  _owner_id;
  _owner_name;
  _peer;

  // Send
  _file;
  _remotePeers = {};

  // Receive
  _conn;
  _chunks = [];
  _transferred = 0;

  constructor(data) {
    Object.assign(this, data);
  }

  get id() {
    return this._id;
  }

  get name() {
    return this._name
  }

  get md5() {
    return this._md5
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
    return this._peer.id
  }

  get remotePeers() {
    return this._remotePeers
  }

  set progress(data) {
    this._remotePeers[data.peer].progress = data.progress
  }

  async init() {
    await new Promise((resolve) => {
      // Create a new Peer instance
      this._peer = new Peer();

      // Emitted when a connection to the PeerServer is established.
      this._peer.on('open', (id) => this._handleOpen(id, resolve));

      // Emitted when a new data connection is established from a remote peer.
      this._peer.on('connection', (conn) => conn.on('open', () => this._handleConnection(conn)));

      // Errors on the peer are almost always fatal and will destroy the peer.
      this._peer.on('error', (err) => this._handleError(err));
    })
  }

  async connect(peer_id, metadata = {}) {
    await new Promise((resolve) => {
      // Establish a connection with the target peer.
      const conn = this._peer.connect(peer_id, {"metadata": metadata});

      // Emitted when the connection is established and ready-to-use.
      conn.on('open', () => this._handleConnection(conn, resolve));
    })
  }

  transfer(peer_id) {
    // Update UI
    document.getElementById(`file-${this._id}-icon-loading`).style.display = 'block'
    document.getElementById(`file-${this._id}-progress`).innerHTML = '0% |'

    // Define vars for chunk processing
    const chunkSize = 8 * 1024 * 1024 // 8 MB
    let offset = 0

    // Recursive function to process each chunk
    const processChunk = async () => {
      // Get the current chunk based on the offset and chunk size
      const chunk = this._file.slice(offset, offset + chunkSize)
      const isLastChunk = offset + chunkSize >= this._size

      // Check if the connection to the remote peer is open
      if (this._remotePeers[peer_id].conn.open) {
        const encryptedChunk = await this._encrypt(chunk, `${this._peer.id}-${password.value}`)
        this._remotePeers[peer_id].conn.send({ "id": this._id, "file": encryptedChunk, "transferred": chunk.size, "last": isLastChunk })
      }

      // If it's not the last chunk, process the next one
      if (!isLastChunk) {
        offset += chunkSize
        await processChunk()
      }
    }
    // Start processing the chunks
    processChunk()
  }

  reject() {
    // The sender peer has rejected a file
    if (this._type == 'send') {
      // Close all peers connections
      for (let p of Object.values(this._remotePeers)) p.conn.close()
    }
    // The receive peer has rejected a file
    else if (this._type == 'receive') {
      // Close the file connection
      this._conn.file.close()
    }
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

    // Store connection
    if (this._type == 'send') this._remotePeers[conn.metadata.origin] = {"conn": conn, "progress": 0}
    else if (this._type == 'receive') this._conn['file'] = conn

    // Resolve
    if (resolve !== undefined) resolve()
  }

  // Emitted when data is received from the remote peer.
  async _handleData(conn, data) {
    // Store file chunk
    const decryptedChunk = await this._decrypt(data.file, `${conn.peer}-${password.value}`)
    this._chunks.push(decryptedChunk)
    this._transferred += data.transferred

    // Update Progress UI
    this._progress = Math.floor(this._transferred / this._size * 100)
    document.getElementById(`file-${this._id}-progress`).innerHTML = `${this._progress}% |`

    // Notify progress
    this._conn.user.send({'webrtc-file-progress': {"file": this._id, "progress": this._progress}})

    // If it's the last chunk
    if (data.last) {
      // Update UI
      document.getElementById(`file-${this._id}-reject`).style.display = 'none'
      document.getElementById(`file-${this._id}-icon-loading`).style.display = 'none'
      document.getElementById(`file-${this._id}-icon-success`).style.display = 'block'

      // Create a new Blob from all file chunks
      const blob = new Blob(this._chunks);

      // Download merged file
      const downloadLink = document.createElement('a')
      downloadLink.href = URL.createObjectURL(blob)
      downloadLink.download = this._name
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      URL.revokeObjectURL(downloadLink.href)
    }
  }

  // Emitted when either you or the remote peer closes the data connection.
  _handleClose(conn) {}

  // Emitted when there is an unexpected error in the data connection.
  _handleError(err) {
    console.error("An error occurred.", err)
  }

  // Function to encrypt a chunk of data with AES-CBC
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

    // Step 7: Return the encrypted data, IV, and key as ArrayBuffer
    return encryptedData;
  }

  // Function to decrypt a chunk of encrypted data with AES-CBC
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

    // Step 7: Return the decrypted Blob
    return decryptedBlob;
  }
}