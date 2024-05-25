<div align="center">

# FileSync

*"Send files from one device to many in real-time"*

<img width="100" src="src/assets/icon.png">

<br>
<br>

[![FileSync](https://img.shields.io/badge/Website-736e9b?style=for-the-badge)](https://www.filesync.app)

[![License: MIT](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](LICENSE)

<br>

FileSync.app is a file sharing web application that allows users to transfer files between multiple devices with end-to-end encryption.

No account creation or signups are required. It enables both one-to-one and many-to-many file transfers, works across various networks and devices, and requires no app installation.

<br>

![FileSync](src/assets/filesync.png)

</div>

## Under the hood

FileSync uses [PeerJS](https://github.com/peers/peerjs) (a WebRTC wrapper) to transfer files between multiple devices. Files shared are peer-to-peer, which means there is a direct file transfer between the sender and receiver without any intermediate server. Your files remain private and secure throughout the entire transfer process.

Do note that a [PeerJS server](https://github.com/peers/peerjs-server) is used to assist in the initial connection setup, ensuring all users can establish peer-to-peer connections effectively. Once the connections are established, the server steps back, allowing the direct transfer of files between the sender and the receiver. At no point during this process does the server have access to the file contents. It solely facilitates the connection between users without compromising the privacy or security of the files being shared.

![File Transfer - https://xkcd.com/949](src/assets/comic.png)