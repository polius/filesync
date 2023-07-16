# FileSync

[https://filesync.app](https://filesync.app)

FileSync.app is a file sharing web app that allows users to transfer files between multiple devices.

This solution simplifies file sharing by leveraging WebRTC, an open framework for the web that enables Real-Time Communications capabilities in the browser.

No account creation or signups are required. It enables both one-to-one and many-to-many file transfers, works across various networks and devices, and requires no app installation.

This app ensures robust security through end-to-end encryption. When a file is uploaded, it is divided into smaller chunks, and each chunk undergoes encryption using AES-GCM. These encrypted chunks are then transmitted to the other users in the room. When the file is downloaded by the intended recipient, all the encrypted chunks are decrypted, ensuring complete security throughout the transmission process.

### ➕ Create a room

A room is a collection of users among which you want to send/receive files. Rooms can be thought of as group chats in messaging apps. Each user in a room must have a unique name for them to correctly join the room. After the room is created, wait for other users to join.

### ⚡ Send a file

Click on the 'Send File' button at the bottom right and choose the files that you want to send. Once the files are selected, they will be automatically shared with all other users in that room.

Please note that if the sender of a file leaves the room, any ongoing file transfers will be automatically cancelled. This is because your files are not stored on any server and are transferred in real-time when you are online.

### 💻 Under the hood

FileSync uses [PeerJS](https://github.com/peers/peerjs) (a WebRTC wrapper) to transfer files between multiple devices. Files shared are peer-to-peer, which means there is direct file transfer between the sender and receiver without any intermediate server. Your files remain private and secure throughout the entire transfer process.

Do note that a [PeerJS server](https://github.com/peers/peerjs-server) is used to assist in the initial connection setup, ensuring all users can establish peer-to-peer connections effectively. Once the connections are established, the server steps back, allowing the direct transfer of files between the sender and the receiver. At no point during this process does the server have access to the file contents. It solely facilitates the connection between users without compromising the privacy or security of the files being shared.

![File Transfer - https://xkcd.com/949](assets/comic.png)

Released under the MIT License.