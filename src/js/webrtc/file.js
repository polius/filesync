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
    const chunkSize = 10 * 1024 * 1024 // 10 MB
    // const chunkSize = 1 // 1 byte
    let offset = 0
  
    // Recursive function to process each chunk
    const processChunk = () => {  
      const chunk = this._file.slice(offset, offset + chunkSize)
      const isLastChunk = offset + chunkSize >= this._size

      // Transfer using chunks of 10MB. Keep checking if some peer in "files" var has cancelled the transfer (= false)
      if (this._remotePeers[peer_id].conn.open) {
        this._remotePeers[peer_id].conn.send({ "id": this._id, "file": chunk, "last": isLastChunk })
      }

      if (this._remotePeers[peer_id].conn.open) {
      }
      if (!isLastChunk) {
        offset += chunkSize
        setTimeout(processChunk, 2000);
        // processChunk()
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
    conn.on('data', (data) => this._handleData(data));

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
  _handleData(data) {
    // Store file chunk
    this._chunks.push(data.file)
    this._transferred += data.file.byteLength

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
      const totalLength = this._chunks.reduce((length, buffer) => length + buffer.byteLength, 0)
      const mergedArrayBuffer = new ArrayBuffer(totalLength)
      const mergedUint8Array = new Uint8Array(mergedArrayBuffer)
      let offset = 0

      for (const buffer of this._chunks) {
        mergedUint8Array.set(new Uint8Array(buffer), offset)
        offset += buffer.byteLength
      }
      const blob = new Blob([mergedArrayBuffer])

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
}