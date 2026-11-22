
// ============================================================
// PROOFLOCK — MAIN APPLICATION
// File hashing | Blockchain sealing | PDF certificate | QR
// ============================================================


// -------------------- CONFIGURATION -------------------------

const CONTRACT_ADDRESS =
    "0xb1d599e8f01920d3181Cf71D2fDA0762E0d79dfc";

const CONTRACT_ABI = [
    "function seal(bytes32 fileHash)",
    "function verify(bytes32 fileHash) view returns (bool exists, address owner, uint256 timestamp)"
];

const SEPOLIA_CHAIN_ID = 11155111;

const SEPOLIA_RPC =
    "https://ethereum-sepolia-rpc.publicnode.com";

const ETHERSCAN_TX_URL =
    "https://sepolia.etherscan.io/tx/";

const ETHERSCAN_ADDRESS_URL =
    "https://sepolia.etherscan.io/address/";

// Public verification page.
// QR codes must use this URL, not the local Live Server URL.
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


// -------------------- BLOCKCHAIN PROVIDERS -------------------

function getReadOnlyContract() {

    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);

    return new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
    );
}


async function getWalletContract() {

    if (!window.ethereum) {
        throw new Error(
            "MetaMask is not installed. Please install MetaMask first."
        );
    }

    const provider = new ethers.BrowserProvider(window.ethereum);

    const network = await provider.getNetwork();

    if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
        throw new Error(
            "Please switch MetaMask to the Sepolia test network."
        );
    }

    const signer = await provider.getSigner();

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

    const hashArray = Array.from(new Uint8Array(hashBuffer));

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


// Display a clickable Etherscan link in the status area.

function setSealSuccessStatus(transactionHash) {

    setSealStatus(
        "success",
        "Evidence sealed successfully! Your fingerprint is recorded on the Sepolia blockchain."
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

    const icon = verificationResult.querySelector(".result-icon");

    if (icon) {

        if (type === "match") {
            icon.textContent = "✓";
        } else if (type === "no-match" || type === "error") {
            icon.textContent = "!";
        } else if (type === "pending") {
            icon.textContent = "…";
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

            hashButton.textContent =
                "Generating fingerprint...";

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

            hashButton.textContent =
                "Generate fingerprint";
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


// -------------------- SEAL ON BLOCKCHAIN --------------------

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

            sealButton.textContent = "Connecting wallet...";

            setSealStatus(
                "pending",
                "Connect MetaMask and approve the transaction."
            );

            const {
                provider,
                signer,
                contract
            } = await getWalletContract();

            const walletAddress = await signer.getAddress();

            sealButton.textContent =
                "Waiting for confirmation...";

            const transaction =
                await contract.seal(currentFileHash);

            setSealStatus(
                "pending",
                "Transaction submitted. Waiting for blockchain confirmation..."
            );

            const receipt = await transaction.wait();

            if (!receipt || receipt.status !== 1) {
                throw new Error(
                    "The blockchain transaction was not successful."
                );
            }

            const block = await provider.getBlock(
                receipt.blockNumber
            );

            if (!block) {
                throw new Error(
                    "Transaction succeeded, but its block timestamp could not be retrieved. Check the transaction on Etherscan."
                );
            }

            const sealedTimestamp = Number(block.timestamp);

            latestCertificateData = {

                fileName: selectedEvidenceFile.name,

                fileHash: currentFileHash,

                transactionHash: transaction.hash,

                walletAddress: walletAddress,

                sealedTimestamp: sealedTimestamp
            };


            // Show success and clickable Etherscan link.

            setSealSuccessStatus(transaction.hash);


            if (certificateSection) {
                certificateSection.hidden = false;
            }

            if (certificateButton) {
                certificateButton.disabled = false;
            }

        } catch (error) {

            console.error(error);

            let message = "Unable to seal the evidence.";

            if (error.code === "ACTION_REJECTED") {

                message =
                    "Transaction was rejected in MetaMask.";

            } else if (
                error.code === "CALL_EXCEPTION" ||
                error.code === "INSUFFICIENT_FUNDS"
            ) {

                message = error.shortMessage || error.message;

            } else if (error.message) {

                message = error.message;
            }

            setSealStatus("error", message);

        } finally {

            sealButton.disabled = false;

            sealButton.textContent =
                "Seal on blockchain";
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
    const pageHeight = 297;


    // Background

    pdf.setFillColor(249, 247, 253);

    pdf.rect(
        0,
        0,
        pageWidth,
        pageHeight,
        "F"
    );


    // Header

    pdf.setFillColor(39, 31, 57);

    pdf.rect(
        0,
        0,
        pageWidth,
        43,
        "F"
    );

    pdf.setTextColor(255, 255, 255);

    pdf.setFont("helvetica", "bold");

    pdf.setFontSize(23);

    pdf.text("PROOFLOCK", 18, 20);

    pdf.setFont("helvetica", "normal");

    pdf.setFontSize(9);

    pdf.setTextColor(213, 202, 235);

    pdf.text(
        "DIGITAL EVIDENCE CERTIFICATE",
        18,
        30
    );

    pdf.setFontSize(8);

    pdf.text(
        "SEPOLIA TEST NETWORK",
        192,
        20,
        {
            align: "right"
        }
    );


    // Main card

    pdf.setFillColor(255, 255, 255);

    pdf.setDrawColor(222, 215, 235);

    pdf.roundedRect(
        13,
        51,
        184,
        193,
        4,
        4,
        "FD"
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


    addDetail(
        "Evidence file",
        data.fileName
    );

    addDetail(
        "SHA-256 fingerprint",
        data.fileHash
    );

    addDetail(
        "Blockchain timestamp",
        formatTimestamp(data.sealedTimestamp)
    );

    addDetail(
        "Wallet address",
        data.walletAddress
    );

    addDetail(
        "Transaction hash",
        data.transactionHash
    );


    // QR code

    const qrContainer = document.createElement("div");

    // IMPORTANT:
    // Use the public GitHub Pages URL.
    // Do not use window.location.href here.
    // Otherwise local certificates contain 127.0.0.1.

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

    const qrCanvas =
        qrContainer.querySelector("canvas");

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

    pdf.line(
        20,
        qrY - 5,
        190,
        qrY - 5
    );

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

    pdf.text(
        "SCAN TO VERIFY",
        59,
        qrY + 9
    );

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
        {
            align: "center"
        }
    );

    pdf.text(
        "Contract: " + CONTRACT_ADDRESS,
        105,
        275,
        {
            align: "center"
        }
    );

    pdf.setFont("helvetica", "bold");

    pdf.setTextColor(91, 69, 126);

    pdf.text(
        "PROOFLOCK  |  DIGITAL EVIDENCE INTEGRITY",
        105,
        285,
        {
            align: "center"
        }
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

let qrRecordFound = false;


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

            qrRecordFound = false;

            setVerificationResult(
                "no-match",
                "No blockchain record found",
                "This fingerprint was not found in the ProofLock contract."
            );

            return;
        }

        qrRecordFound = true;

        setVerificationResult(
            "match",
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


        // If the verification page was opened using a QR code,
        // compare the uploaded file against the certificate hash.

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


            // The file matches the QR fingerprint.
            // Now confirm that the fingerprint exists on-chain.

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


        // If the page was opened directly without a QR code,
        // check whether the uploaded file's fingerprint exists.

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
