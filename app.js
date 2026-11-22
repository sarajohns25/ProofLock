
// ============================================================
// PROOFLOCK — MAIN APPLICATION
// File hashing | Blockchain sealing | PDF certificate | QR
// Wallet-free blockchain verification
// ============================================================


// -------------------- CONFIGURATION -------------------------

const CONTRACT_ADDRESS =
    "0xb1d599e8f01920d3181Cf71D2fDA0762E0d79dfc";

const CONTRACT_ABI = [
    "function seal(bytes32 fileHash)",
    "function verify(bytes32 fileHash) view returns (bool exists, address owner, uint256 timestamp)"
];

const SEPOLIA_CHAIN_ID = 11155111;
const SEPOLIA_CHAIN_HEX = "0xaa36a7";

const SEPOLIA_RPC =
    "https://ethereum-sepolia-rpc.publicnode.com";

const ETHERSCAN_TX_URL =
    "https://sepolia.etherscan.io/tx/";

const PUBLIC_VERIFY_URL =
    "https://sarajohns25.github.io/ProofLock/verify.html";


// -------------------- DOM ELEMENTS ---------------------------

const fileInput = document.getElementById("file");
const uploadZone = document.getElementById("uploadZone");
const selectedFile = document.getElementById("selectedFile");

const hashButton = document.getElementById("hashButton");
const sealButton = document.getElementById("sealButton");

const hashOutput = document.getElementById("hash");
const copyHashButton = document.getElementById("copyHashButton");

const sealStatus = document.getElementById("sealStatus");

const certificateSection =
    document.getElementById("certificateSection");

const certificateButton =
    document.getElementById("certificateButton");

// Verification page elements

const verifyButton = document.getElementById("verifyButton");

const verificationResult =
    document.getElementById("verificationResult");

const resultTitle =
    document.getElementById("resultTitle");

const resultMessage =
    document.getElementById("resultMessage");

const resultDetails =
    document.getElementById("resultDetails");

const expectedHashElement =
    document.getElementById("expectedHash");

const qrRecordCard =
    document.getElementById("qrRecordCard");


// -------------------- APPLICATION STATE ----------------------

let selectedEvidenceFile = null;
let currentFileHash = null;
let latestCertificateData = null;


// -------------------- READ-ONLY PROVIDER ---------------------

function getReadOnlyProvider() {
    return new ethers.JsonRpcProvider(SEPOLIA_RPC);
}

function getReadOnlyContract() {
    const provider = getReadOnlyProvider();

    return new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
    );
}


// -------------------- NETWORK VALIDATION ---------------------

async function getCurrentWalletChainId() {
    if (!window.ethereum) {
        throw new Error(
            "MetaMask is not installed. Please install MetaMask first."
        );
    }

    const chainIdHex = await window.ethereum.request({
        method: "eth_chainId"
    });

    return Number.parseInt(chainIdHex, 16);
}


async function ensureSepoliaNetwork() {
    const chainId = await getCurrentWalletChainId();

    if (chainId !== SEPOLIA_CHAIN_ID) {
        throw new Error(
            "WRONG_NETWORK"
        );
    }

    return true;
}


async function checkContractDeployment(provider) {
    const code = await provider.getCode(CONTRACT_ADDRESS);

    if (!code || code === "0x") {
        throw new Error(
            "The ProofLock contract was not found on the selected network. Please connect to Sepolia."
        );
    }

    return true;
}


// -------------------- WALLET CONTRACT ------------------------

async function getWalletContract() {
    if (!window.ethereum) {
        throw new Error(
            "MetaMask is not installed. Please install MetaMask first."
        );
    }

    // First check: read the actual MetaMask chain ID.
    await ensureSepoliaNetwork();

    // Use "any" so ethers can detect network changes.
    const provider = new ethers.BrowserProvider(
        window.ethereum,
        "any"
    );

    // Confirm the network using the provider too.
    const network = await provider.getNetwork();

    if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
        throw new Error("WRONG_NETWORK");
    }

    // Confirm the contract exists at this address.
    await checkContractDeployment(provider);

    const signer = await provider.getSigner();

    // Check again after obtaining the signer.
    await ensureSepoliaNetwork();

    const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
    );

    return {
        provider,
        signer,
        contract
    };
}


// -------------------- FILE HASHING ---------------------------

async function calculateSHA256(file) {
    const fileBuffer = await file.arrayBuffer();

    const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        fileBuffer
    );

    const hashArray = Array.from(
        new Uint8Array(hashBuffer)
    );

    const hashHex = hashArray
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");

    return "0x" + hashHex;
}


// -------------------- STATUS DISPLAY -------------------------

function setSealStatus(type, message) {
    if (!sealStatus) return;

    sealStatus.className = "status";

    if (type === "success") {
        sealStatus.classList.add("success");
    } else if (type === "error") {
        sealStatus.classList.add("error");
    } else if (type === "pending") {
        sealStatus.classList.add("pending");
    } else {
        sealStatus.classList.add("status-placeholder");
    }

    sealStatus.replaceChildren();

    const icon = document.createElement("span");
    const paragraph = document.createElement("p");

    icon.textContent =
        type === "success" ? "✓" :
        type === "error" ? "!" :
        type === "pending" ? "…" : "i";

    paragraph.textContent = message;

    sealStatus.append(icon, paragraph);
}


function setSealSuccessStatus(transactionHash) {
    setSealStatus(
        "success",
        "Evidence sealed successfully! Its fingerprint is recorded on the Sepolia blockchain."
    );

    const paragraph = sealStatus?.querySelector("p");

    if (!paragraph) return;

    const transactionLabel = document.createTextNode(
        " Transaction: "
    );

    const transactionLink = document.createElement("a");

    transactionLink.href =
        ETHERSCAN_TX_URL + transactionHash;

    transactionLink.textContent = "View on Etherscan";
    transactionLink.target = "_blank";
    transactionLink.rel = "noopener noreferrer";

    paragraph.append(transactionLabel, transactionLink);
}


function setVerificationResult(
    type,
    title,
    message,
    details = ""
) {
    if (!verificationResult) return;

    verificationResult.className = "result " + type;

    if (resultTitle) {
        resultTitle.textContent = title;
    }

    if (resultMessage) {
        resultMessage.textContent = message;
    }

    if (resultDetails) {
        resultDetails.textContent = details;
    }

    const icon =
        verificationResult.querySelector(".result-icon");

    if (icon) {
        if (type === "match") {
            icon.textContent = "✓";
        } else if (type === "no-match" || type === "error") {
            icon.textContent = "!";
        } else if (type === "pending") {
            icon.textContent = "…";
        } else {
            icon.textContent = "i";
        }
    }
}


// -------------------- FILE SELECTION -------------------------

function handleFileSelection(file) {
    if (!file) return;

    selectedEvidenceFile = file;
    currentFileHash = null;
    latestCertificateData = null;

    if (selectedFile) {
        selectedFile.textContent = file.name;
    }

    if (hashOutput) {
        hashOutput.textContent =
            "Your SHA-256 fingerprint will appear here.";

        hashOutput.classList.add("empty-hash");
    }

    if (certificateSection) {
        certificateSection.hidden = true;
    }

    if (sealButton) {
        sealButton.disabled = true;
    }

    setSealStatus(
        "info",
        "File selected. Generate its fingerprint to continue."
    );
}


if (fileInput) {
    fileInput.addEventListener("change", () => {
        handleFileSelection(fileInput.files[0]);
    });
}


// -------------------- DRAG AND DROP --------------------------

if (uploadZone && fileInput) {
    uploadZone.addEventListener("dragover", event => {
        event.preventDefault();
        uploadZone.classList.add("dragging");
    });

    uploadZone.addEventListener("dragleave", () => {
        uploadZone.classList.remove("dragging");
    });

    uploadZone.addEventListener("drop", event => {
        event.preventDefault();

        uploadZone.classList.remove("dragging");

        const file = event.dataTransfer.files[0];

        if (!file) return;

        fileInput.files = event.dataTransfer.files;

        handleFileSelection(file);
    });
}


// -------------------- GENERATE FINGERPRINT -------------------

if (hashButton) {
    hashButton.addEventListener("click", async () => {
        if (!selectedEvidenceFile) {
            setSealStatus(
                "error",
                "Please select a file first."
            );

            return;
        }

        try {
            hashButton.disabled = true;
            hashButton.textContent = "Generating fingerprint...";

            currentFileHash =
                await calculateSHA256(selectedEvidenceFile);

            if (hashOutput) {
                hashOutput.textContent = currentFileHash;
                hashOutput.classList.remove("empty-hash");
            }

            if (sealButton) {
                sealButton.disabled = false;
            }

            setSealStatus(
                "success",
                "Fingerprint generated successfully. You can now seal this evidence."
            );

        } catch (error) {
            console.error(error);

            setSealStatus(
                "error",
                "Unable to generate the fingerprint. Please try again."
            );

        } finally {
            hashButton.disabled = false;
            hashButton.textContent = "Generate fingerprint";
        }
    });
}


// -------------------- COPY FINGERPRINT -----------------------

if (copyHashButton) {
    copyHashButton.addEventListener("click", async () => {
        if (!currentFileHash) {
            setSealStatus(
                "error",
                "Generate a fingerprint before copying."
            );

            return;
        }

        try {
            await navigator.clipboard.writeText(currentFileHash);

            copyHashButton.textContent = "Copied!";

            setTimeout(() => {
                copyHashButton.textContent = "Copy";
            }, 1500);

        } catch (error) {
            console.error(error);

            setSealStatus(
                "error",
                "Unable to copy the fingerprint. Please copy it manually."
            );
        }
    });
}


// -------------------- CHECK EXISTING RECORD ------------------

async function checkExistingRecord(hash) {
    const contract = getReadOnlyContract();

    const result = await contract.verify(hash);

    return {
        exists: result[0],
        owner: result[1],
        timestamp: Number(result[2])
    };
}


// -------------------- ERROR MESSAGE HANDLING -----------------

function getSealErrorMessage(error) {
    console.error("ProofLock sealing error:", error);

    if (
        error.message === "WRONG_NETWORK" ||
        error.message?.includes("WRONG_NETWORK")
    ) {
        return "Wrong network. Please switch MetaMask to the Sepolia test network and try again.";
    }

    if (error.code === "ACTION_REJECTED") {
        return "Transaction was rejected in MetaMask. No seal was created.";
    }

    if (
        error.code === "INSUFFICIENT_FUNDS" ||
        error.message?.toLowerCase().includes("insufficient funds")
    ) {
        return "Insufficient Sepolia ETH to pay the transaction fee.";
    }

    const errorText = (
        error.shortMessage ||
        error.reason ||
        error.message ||
        ""
    ).toLowerCase();

    if (
        errorText.includes("already sealed") ||
        errorText.includes("already exists")
    ) {
        return "This file has already been sealed on the blockchain. Use its existing certificate to verify it.";
    }

    if (
        error.code === "CALL_EXCEPTION" ||
        errorText.includes("execution reverted")
    ) {
        return "The smart contract rejected this request. The file may already be sealed.";
    }

    if (
        error.code === "NETWORK_ERROR" ||
        error.code === "SERVER_ERROR" ||
        errorText.includes("network")
    ) {
        return "Unable to communicate with the blockchain. Check your connection and try again.";
    }

    return "Unable to seal the evidence. Please check your wallet and try again.";
}


// -------------------- SEAL ON BLOCKCHAIN ---------------------

if (sealButton) {
    sealButton.addEventListener("click", async () => {
        if (!selectedEvidenceFile || !currentFileHash) {
            setSealStatus(
                "error",
                "Generate a fingerprint first."
            );

            return;
        }

        try {
            sealButton.disabled = true;
            sealButton.textContent = "Checking network...";

            if (certificateSection) {
                certificateSection.hidden = true;
            }

            latestCertificateData = null;

            // CHECK 1: Verify the actual MetaMask network.
            await ensureSepoliaNetwork();

            setSealStatus(
                "pending",
                "Checking whether this fingerprint has already been sealed..."
            );

            // CHECK 2: Check for duplicates before requesting a transaction.
            let existingRecord;

            try {
                existingRecord =
                    await checkExistingRecord(currentFileHash);

            } catch (lookupError) {
                console.error(lookupError);

                throw new Error(
                    "Unable to check existing blockchain records. Please try again before sealing."
                );
            }

            if (existingRecord.exists) {
                setSealStatus(
                    "error",
                    "This file has already been sealed on the blockchain. Use its existing certificate to verify it."
                );

                return;
            }

            // CHECK 3: Connect wallet and check Sepolia.
            sealButton.textContent = "Connecting wallet...";

            const {
                provider,
                signer,
                contract
            } = await getWalletContract();

            const walletAddress = await signer.getAddress();

            // CHECK 4: Recheck immediately before submitting.
            await ensureSepoliaNetwork();

            const currentNetwork = await provider.getNetwork();

            if (Number(currentNetwork.chainId) !== SEPOLIA_CHAIN_ID) {
                throw new Error("WRONG_NETWORK");
            }

            await checkContractDeployment(provider);

            setSealStatus(
                "pending",
                "Sepolia confirmed. Waiting for MetaMask transaction approval..."
            );

            sealButton.textContent = "Waiting for confirmation...";

            // Submit the transaction only after all checks.
            const transaction =
                await contract.seal(currentFileHash);

            // Check the transaction's reported chain ID.
            if (
                transaction.chainId &&
                Number(transaction.chainId) !== SEPOLIA_CHAIN_ID
            ) {
                throw new Error(
                    "The transaction was submitted on an unexpected network."
                );
            }

            setSealStatus(
                "pending",
                "Transaction submitted. Waiting for Sepolia confirmation..."
            );

            // Wait for the transaction using the Sepolia read-only RPC.
            const readOnlyProvider = getReadOnlyProvider();

            const receipt = await readOnlyProvider.waitForTransaction(
                transaction.hash,
                1,
                120000
            );

            if (!receipt) {
                throw new Error(
                    "Transaction confirmation timed out. Check the transaction on Etherscan before trying again."
                );
            }

            if (receipt.status !== 1) {
                throw new Error(
                    "The blockchain transaction failed. No certificate was generated."
                );
            }

            // Confirm that the transaction went to our contract.
            if (
                !receipt.to ||
                receipt.to.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()
            ) {
                throw new Error(
                    "The transaction destination does not match the ProofLock contract."
                );
            }

            // Confirm the transaction actually created the record.
            const confirmedRecord =
                await checkExistingRecord(currentFileHash);

            if (!confirmedRecord.exists) {
                throw new Error(
                    "The transaction was confirmed, but the fingerprint could not be found in the ProofLock contract. Do not generate a certificate."
                );
            }

            // Retrieve the confirmed block timestamp.
            const block = await readOnlyProvider.getBlock(
                receipt.blockNumber
            );

            if (!block) {
                throw new Error(
                    "The transaction succeeded, but its block timestamp could not be retrieved. Check Etherscan."
                );
            }

            const sealedTimestamp = Number(block.timestamp);

            // Only now create certificate data.
            latestCertificateData = {
                fileName: selectedEvidenceFile.name,
                fileHash: currentFileHash,
                transactionHash: transaction.hash,
                walletAddress: confirmedRecord.owner,
                sealedTimestamp: sealedTimestamp
            };

            setSealSuccessStatus(transaction.hash);

            if (certificateSection) {
                certificateSection.hidden = false;
            }

            if (certificateButton) {
                certificateButton.disabled = false;
            }

        } catch (error) {
            const message = getSealErrorMessage(error);

            setSealStatus("error", message);

            // Never leave certificate data after a failed attempt.
            latestCertificateData = null;

            if (certificateSection) {
                certificateSection.hidden = true;
            }

        } finally {
            sealButton.disabled = false;
            sealButton.textContent = "Seal on blockchain";
        }
    });
}


// -------------------- DATE FORMATTING ------------------------

function formatTimestamp(timestamp) {
    return new Date(
        Number(timestamp) * 1000
    ).toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    );
}


// -------------------- PDF CERTIFICATE -----------------------

async function generateCertificate() {
    if (!latestCertificateData) {
        alert("No successful seal record is available.");
        return;
    }

    if (!window.jspdf || !window.QRCode) {
        alert(
            "The PDF or QR library could not load. Check your internet connection and refresh the page."
        );

        return;
    }

    const data = latestCertificateData;
    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    });

    const pageWidth = 210;

    // Background
    pdf.setFillColor(249, 247, 253);
    pdf.rect(0, 0, pageWidth, 297, "F");

    // Header
    pdf.setFillColor(39, 31, 57);
    pdf.rect(0, 0, pageWidth, 43, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(23);
    pdf.text("PROOFLOCK", 18, 20);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(213, 202, 235);
    pdf.text("DIGITAL EVIDENCE CERTIFICATE", 18, 30);

    pdf.setFontSize(8);
    pdf.text(
        "SEPOLIA TEST NETWORK",
        192,
        20,
        { align: "right" }
    );

    // Main card
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(222, 215, 235);

    pdf.roundedRect(
        13, 51, 184, 193, 4, 4, "FD"
    );

    // Certificate heading
    pdf.setTextColor(57, 43, 78);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);

    pdf.text(
        "Evidence successfully sealed",
        20,
        66
    );

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(112, 103, 125);

    pdf.text(
        "This certificate records the blockchain fingerprint of the submitted file.",
        20,
        74
    );

    // Reference
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(125, 111, 151);

    pdf.text(
        "CERTIFICATE REFERENCE",
        20,
        88
    );

    const reference =
        data.transactionHash.slice(0, 18).toUpperCase();

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(57, 43, 78);

    pdf.text(reference, 20, 95);

    // Divider
    pdf.setDrawColor(231, 226, 239);
    pdf.line(20, 102, 190, 102);

    // Details helper
    let y = 113;

    function addDetail(label, value, maxWidth = 168) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setTextColor(125, 111, 151);

        pdf.text(label.toUpperCase(), 20, y);

        y += 6;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.5);
        pdf.setTextColor(48, 42, 59);

        const lines = pdf.splitTextToSize(
            String(value),
            maxWidth
        );

        pdf.text(lines, 20, y);

        y += lines.length * 4.5 + 7;
    }

    addDetail("Evidence file", data.fileName);
    addDetail("SHA-256 fingerprint", data.fileHash);
    addDetail(
        "Blockchain timestamp",
        formatTimestamp(data.sealedTimestamp)
    );
    addDetail("Wallet address", data.walletAddress);
    addDetail("Transaction hash", data.transactionHash);

    // QR code
    const qrContainer = document.createElement("div");

    const verificationURL =
        PUBLIC_VERIFY_URL +
        "?hash=" +
        encodeURIComponent(data.fileHash);

    new QRCode(qrContainer, {
        text: verificationURL,
        width: 220,
        height: 220,
        correctLevel: QRCode.CorrectLevel.M
    });

    const qrCanvas = qrContainer.querySelector("canvas");

    if (!qrCanvas) {
        alert(
            "Unable to generate the QR code. Please try again."
        );

        return;
    }

    const qrImage = qrCanvas.toDataURL("image/png");

    // QR section
    const qrY = Math.min(
        Math.max(y + 2, 181),
        203
    );

    pdf.setDrawColor(231, 226, 239);
    pdf.line(20, qrY - 5, 190, qrY - 5);

    pdf.addImage(
        qrImage,
        "PNG",
        20,
        qrY,
        31,
        31
    );

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(57, 43, 78);

    pdf.text("SCAN TO VERIFY", 59, qrY + 9);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(112, 103, 125);

    pdf.text(
        pdf.splitTextToSize(
            "Scan this QR code to check the recorded fingerprint on the Sepolia blockchain.",
            122
        ),
        59,
        qrY + 16
    );

    // Footer
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(130, 122, 141);

    pdf.text(
        "ProofLock records file fingerprints. It does not establish the truth or authenticity of file contents.",
        105,
        267,
        { align: "center" }
    );

    pdf.text(
        "Contract: " + CONTRACT_ADDRESS,
        105,
        275,
        { align: "center" }
    );

    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(91, 69, 126);

    pdf.text(
        "PROOFLOCK  |  DIGITAL EVIDENCE INTEGRITY",
        105,
        285,
        { align: "center" }
    );

    // Safe PDF filename
    const safeName = data.fileName
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-z0-9_-]/gi, "_")
        .slice(0, 45);

    pdf.save(
        "ProofLock_Certificate_" + safeName + ".pdf"
    );
}


if (certificateButton) {
    certificateButton.addEventListener(
        "click",
        generateCertificate
    );
}


// ============================================================
// VERIFICATION PAGE
// ============================================================


// -------------------- BLOCKCHAIN RECORD LOOKUP --------------

async function lookupBlockchainRecord(hash) {
    const contract = getReadOnlyContract();

    const result = await contract.verify(hash);

    return {
        exists: result[0],
        owner: result[1],
        timestamp: Number(result[2])
    };
}


// -------------------- QR CODE VERIFICATION ------------------

const urlParameters =
    new URLSearchParams(window.location.search);

const qrHash = urlParameters.get("hash");


async function verifyQRRecord() {
    if (!qrHash || !verificationResult) return;

    if (!/^0x[a-fA-F0-9]{64}$/.test(qrHash)) {
        setVerificationResult(
            "error",
            "Invalid QR fingerprint",
            "The fingerprint in this QR link is not valid."
        );

        return;
    }

    if (expectedHashElement) {
        expectedHashElement.textContent = qrHash;
    }

    if (qrRecordCard) {
        qrRecordCard.hidden = false;
    }

    setVerificationResult(
        "pending",
        "Checking blockchain record",
        "Looking for this fingerprint on the Sepolia network..."
    );

    try {
        const record =
            await lookupBlockchainRecord(qrHash);

        if (!record.exists) {
            setVerificationResult(
                "no-match",
                "No blockchain record found",
                "This fingerprint was not found in the ProofLock contract."
            );

            return;
        }

        setVerificationResult(
            "pending",
            "Blockchain record found",
            "This certificate fingerprint exists on the Sepolia blockchain. Upload the evidence file below to compare its contents.",
            "Recorded by: " + record.owner +
            "\nTimestamp: " +
            formatTimestamp(record.timestamp)
        );

    } catch (error) {
        console.error(error);

        setVerificationResult(
            "error",
            "Verification unavailable",
            "Could not connect to the Sepolia blockchain. Please try again."
        );
    }
}


// -------------------- MANUAL FILE VERIFICATION --------------

async function verifySelectedFile() {
    if (!fileInput || !fileInput.files[0]) {
        setVerificationResult(
            "error",
            "No file selected",
            "Please select the evidence file you want to verify."
        );

        return;
    }

    const file = fileInput.files[0];

    try {
        if (verifyButton) {
            verifyButton.disabled = true;
            verifyButton.textContent = "Verifying...";
        }

        setVerificationResult(
            "pending",
            "Verifying evidence",
            "Generating the file fingerprint and checking the blockchain..."
        );

        const uploadedHash =
            await calculateSHA256(file);

        // QR certificate verification
        if (qrHash) {
            if (
                uploadedHash.toLowerCase() !==
                qrHash.toLowerCase()
            ) {
                setVerificationResult(
                    "no-match",
                    "NO MATCH — File differs",
                    "The uploaded file does not match the fingerprint stored in this certificate.",
                    "Uploaded fingerprint: " + uploadedHash +
                    "\nCertificate fingerprint: " + qrHash
                );

                return;
            }

            // File matches QR fingerprint.
            // Confirm the fingerprint exists on-chain.
            const record =
                await lookupBlockchainRecord(qrHash);

            if (!record.exists) {
                setVerificationResult(
                    "no-match",
                    "No blockchain record found",
                    "The file matches the QR fingerprint, but that fingerprint is not registered in the ProofLock contract."
                );

                return;
            }

            setVerificationResult(
                "match",
                "MATCH — Evidence verified",
                "The uploaded file matches the certificate fingerprint, and that fingerprint is recorded on the Sepolia blockchain.",
                "File: " + file.name +
                "\nFingerprint: " + uploadedHash +
                "\nRecorded by: " + record.owner +
                "\nTimestamp: " +
                formatTimestamp(record.timestamp)
            );

            return;
        }

        // Direct verification without QR.
        const record =
            await lookupBlockchainRecord(uploadedHash);

        if (!record.exists) {
            setVerificationResult(
                "no-match",
                "NO MATCH — No record found",
                "This file's fingerprint does not have a matching record in the ProofLock contract.",
                "Fingerprint: " + uploadedHash
            );

            return;
        }

        setVerificationResult(
            "match",
            "MATCH — Evidence verified",
            "The uploaded file's fingerprint is recorded on the Sepolia blockchain.",
            "File: " + file.name +
            "\nFingerprint: " + uploadedHash +
            "\nRecorded by: " + record.owner +
            "\nTimestamp: " +
            formatTimestamp(record.timestamp)
        );

    } catch (error) {
        console.error(error);

        setVerificationResult(
            "error",
            "Verification failed",
            "An error occurred while checking the file. Please try again."
        );

    } finally {
        if (verifyButton) {
            verifyButton.disabled = false;
            verifyButton.textContent = "Verify evidence";
        }
    }
}


if (verifyButton) {
    verifyButton.addEventListener(
        "click",
        verifySelectedFile
    );
}


// -------------------- VERIFICATION FILE SELECTION -----------

if (fileInput && verifyButton) {
    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];

        if (selectedFile && file) {
            selectedFile.textContent = file.name;
        }

        if (file) {
            setVerificationResult(
                "pending",
                "File selected",
                "Click Verify evidence to compare this file with its blockchain record."
            );
        }
    });
}


// -------------------- INITIALIZE VERIFICATION PAGE ----------

if (verificationResult && qrHash) {
    verifyQRRecord();
}


// ============================================================
// END OF PROOFLOCK APPLICATION
// ============================================================
