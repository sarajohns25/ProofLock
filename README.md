# ProofLock 🔐

## If someone says your proof is fake, how do you prove it's real?

**ProofLock – A blockchain-based digital evidence integrity and verification system.**

ProofLock is a project I developed to explore how cryptographic hashing and blockchain technology can help preserve the integrity of digital evidence.

The idea is to generate a unique SHA-256 fingerprint for a digital file and record that fingerprint on a blockchain. Later, the same file can be checked against the recorded fingerprint to see whether it has been modified.

The project focuses on making digital evidence easier to verify without having to upload the original file to a central server.

---

## Project Links

- **Live Application:** https://sarajohns25.github.io/ProofLock/
- **GitHub Repository:** https://github.com/sarajohns25/ProofLock
- **Demo Video:** https://drive.google.com/file/d/1UO8gluIC3swUZ_yzwBiSSTmBZCeoQc61/view?usp=drive_link

---

## 1. The Problem

Digital evidence such as screenshots, images, documents and other files can be modified or deleted. This creates a problem when someone needs to present a file as proof.

For example, imagine a student receiving abusive messages from a fake account. She takes screenshots and reports the incident, but the accused person claims that the screenshots were edited.

Without a reliable way to check whether the files have been modified, the evidence can become difficult to trust.

This is the problem I wanted ProofLock to address.

## 2. The Solution

ProofLock combines SHA-256 hashing and blockchain technology to create a way of recording and checking digital file integrity.

Instead of storing the actual evidence file on the blockchain, the application generates a cryptographic fingerprint and records only that fingerprint.

This allows someone to check a file later without making its original contents publicly available on the blockchain.

## 3. How It Works

The application has two main sections: **Seal** and **Verify**, which can be accessed through the navigation bar.

### Seal

**Step 1 – Select the evidence file**

The user selects a file from their device.

**Step 2 – Generate the fingerprint**

ProofLock uses the SHA-256 algorithm through the browser's Web Crypto API to generate a unique fingerprint for the selected file.

This operation happens locally in the browser.

**Step 3 – Record it on the blockchain**

The user connects MetaMask and selects the Ethereum Sepolia test network.

The fingerprint is sent to the ProofLock smart contract. Once the transaction is confirmed, the fingerprint is recorded on the blockchain with its associated block timestamp.

**Step 4 – Generate the certificate**

After successful sealing, the application generates a downloadable PDF certificate containing the evidence details, fingerprint, transaction information and QR code.

### Verify

**Step 1 – Select the file**

The user switches to the Verify section and selects the file they want to check.

**Step 2 – Generate its fingerprint again**

ProofLock calculates the SHA-256 fingerprint of the selected file.

**Step 3 – Compare it with the blockchain record**

The application checks the fingerprint against the record stored in the smart contract.

**Step 4 – Display the result**

The application displays whether the selected file matches the previously recorded fingerprint.

Verification uses a read-only blockchain connection, so the person checking the file does not need to connect a wallet or pay transaction fees.

---

## 4. Verification Results

| Result | Meaning |
|---|---|
| MATCH | The selected file has the same fingerprint as the one recorded on the blockchain. |
| NO MATCH | The fingerprint is different, or no matching record exists. |

Even a small change to a file can produce a completely different SHA-256 fingerprint. This makes it possible to detect modifications between the originally recorded file and the file being verified.

---

## 5. Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Webpage structure |
| CSS3 | Styling and responsive layout |
| JavaScript | Application functionality |
| SHA-256 | Generating file fingerprints |
| Web Crypto API | Browser-based hashing |
| Solidity | Smart contract development |
| Ethereum Sepolia | Blockchain test network |
| MetaMask | Wallet connection and transaction approval |
| ethers.js | Blockchain interaction |
| jsPDF | PDF certificate generation |
| QRCode.js | QR code generation |
| GitHub Pages | Application hosting |

---

## 6. Smart Contract Details

ProofLock uses a Solidity smart contract deployed on the Ethereum Sepolia test network.

- **Network:** Ethereum Sepolia Testnet
- **Contract Address:** `0xb1d599e8f01920d3181Cf71D2fDA0762E0d79dfc`

[View Contract on Sepolia Etherscan](https://sepolia.etherscan.io/address/0xb1d599e8f01920d3181Cf71D2fDA0762E0d79dfc)

The contract is responsible for recording evidence fingerprints and checking whether a fingerprint has an existing record.

Sepolia is a test network, so the application uses test ETH for transaction gas fees instead of real ETH on Ethereum Mainnet.

---

## 7. Privacy and Security

One of the main things I wanted to achieve with ProofLock was to avoid uploading the original evidence file just to generate its fingerprint.

The application follows this approach:

- The selected file is read locally in the browser.
- SHA-256 hashing is performed using the Web Crypto API.
- The original evidence file is not uploaded to the ProofLock application server.
- Only the file's fingerprint is submitted to the blockchain.
- Verification uses a read-only blockchain connection.
- The application checks the connected wallet network before allowing a sealing transaction.

Since blockchain transactions are public, the recorded fingerprint, transaction timestamp and wallet address can be viewed by others.

---

## 8. Testing and Results

During development, I tested the main application workflows.

| Test | Result |
|---|---|
| SHA-256 fingerprint generation | Passed |
| Successful blockchain sealing | Passed |
| Attempt to seal an already-recorded fingerprint | Rejected |
| Verification of original evidence | MATCH |
| Verification of modified evidence | NO MATCH |
| Verification of an unrecorded file | NO MATCH |
| Wrong-network protection | Passed |
| PDF certificate generation | Passed |
| QR code generation | Passed |
| QR code scanning and verification | Passed |
| Desktop and mobile layout | Checked |
| Network inspection during fingerprint generation | No separate file-upload request observed |

---

## 9. Limitations

ProofLock focuses on checking whether a digital file has changed after its fingerprint was recorded. It is important to understand what this actually establishes.

- A MATCH result means that the file has the same fingerprint as the version previously recorded.
- It does not prove who originally created the file.
- It cannot establish whether the evidence was genuine before it was first recorded.
- The blockchain timestamp represents the time associated with the blockchain transaction, not necessarily the original creation time of the file.
- A blockchain record alone does not establish legal admissibility or a complete chain of custody.
- The current version uses the Sepolia test network and is a prototype rather than a production legal-evidence management system.

ProofLock is intended to support evidence integrity checks, not replace investigation or legal verification.

---

## 10. Future Scope

There are several improvements that could be explored in future versions:

- A browser extension for capturing digital evidence more easily.
- Support for multiple files as a single evidence case.
- Regional-language support.
- A case-history system for organising recorded evidence.
- Additional evidence-export options.

These are possible future improvements and are not included in the current implementation.

---

## 11. Running the Project Locally

### Requirements

- Visual Studio Code
- A modern web browser
- Live Server extension
- MetaMask for blockchain sealing
- Sepolia test ETH for transaction fees

### Setup

**1. Clone the repository**

```bash
git clone https://github.com/sarajohns25/ProofLock.git
```

**2. Open the project**

Open the cloned folder in Visual Studio Code.

**3. Run the application**

Open `index.html` using the Live Server extension.

**4. Connect MetaMask**

For blockchain sealing, connect MetaMask and select the Ethereum Sepolia test network.

**5. Start using ProofLock**

Select an evidence file, generate its fingerprint, seal it on the blockchain and use the Verify section to check its integrity.

---

## 12. What I Learned

Working on ProofLock helped me understand how concepts from cryptography and blockchain can be applied to a practical problem.

Some of the things I explored during development include:

- How SHA-256 hashing helps detect file modifications.
- How the Web Crypto API performs hashing directly in the browser.
- How Solidity smart contracts interact with a web application.
- How MetaMask handles wallet connections and transaction requests.
- How blockchain records can be used for independent verification.
- How PDF certificates and QR codes can be integrated into a web application.

It also helped me understand the limitations of blockchain-based evidence verification. Recording a fingerprint on a blockchain does not automatically prove that the original evidence is genuine. It provides a way to check whether a file matches the version that was recorded.

---

## Project Information

**Project Name:** ProofLock  
**Category:** Cybersecurity / Blockchain / Digital Evidence Integrity  
**Blockchain:** Ethereum Sepolia Testnet  
**Developer:** Sara Johns  

---

*Capture it once. Prove it anywhere.*