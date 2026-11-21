
/* ==========================================
   PROOFLOCK - COMPLETE APPLICATION
   ========================================== */


/* ==========================================
   1. SMART CONTRACT CONNECTION
   ========================================== */

const CONTRACT_ADDRESS =
    "0xb1d599e8f01920d3181Cf71D2fDA0762E0d79dfc";

const CONTRACT_ABI = [
    "function seal(bytes32 fileHash)",
    "function verify(bytes32 fileHash) view returns (bool exists, address owner, uint256 timestamp)"
];


// Wallet-connected contract (sealing and manual verification)

async function getContract() {

    if (!window.ethereum) {
        throw new Error("MetaMask is not installed.");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);

    await provider.send("eth_requestAccounts", []);

    const network = await provider.getNetwork();

    if (Number(network.chainId) !== 11155111) {
        throw new Error("Please switch MetaMask to Sepolia.");
    }

    const signer = await provider.getSigner();

    return new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
    );
}


// Read-only contract (QR verification)

function getReadOnlyContract() {

    const provider = new ethers.JsonRpcProvider(
        "https://ethereum-sepolia-rpc.publicnode.com"
    );

    return new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
    );
}


/* ==========================================
   2. UTILITY FUNCTIONS
   ========================================== */


// SHA-256 fingerprint generation

async function sha256(file) {

    const buf = await file.arrayBuffer();

    const digest = await crypto.subtle.digest(
        "SHA-256",
        buf
    );

    return "0x" + [...new Uint8Array(digest)]
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}


// Escape uploaded filenames before inserting into HTML

function escapeHTML(value) {

    return String(value).replace(/[&<>"']/g, character => {

        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}


// Format blockchain timestamps

function formatTimestamp(timestamp) {

    return new Date(
        Number(timestamp) * 1000
    ).toLocaleString();
}


/* ==========================================
   3. PAGE ELEMENTS
   ========================================== */

const fileInput = document.getElementById("file");

const hashButton = document.getElementById("hashButton");

const hashOutput = document.getElementById("hash");

const sealButton = document.getElementById("sealButton");

const sealStatus = document.getElementById("sealStatus");

const verifyButton = document.getElementById("verifyButton");

const verificationResult = document.getElementById(
    "verificationResult"
);

const certificateSection = document.getElementById(
    "certificateSection"
);

const certificateButton = document.getElementById(
    "certificateButton"
);

let latestCertificateData = null;


/* ==========================================
   4. SEAL PAGE - HASH GENERATION
   index.html
   ========================================== */

if (fileInput && hashButton && hashOutput) {

    hashButton.addEventListener("click", async () => {

        const file = fileInput.files[0];

        if (!file) {

            hashOutput.textContent =
                "Please select a file first.";

            return;
        }

        try {

            hashOutput.textContent =
                "Generating fingerprint...";

            const hash = await sha256(file);

            hashOutput.textContent = hash;

            console.log("File:", file.name);

            console.log("SHA-256:", hash);

        } catch (error) {

            console.error(error);

            hashOutput.textContent =
                "Error generating fingerprint.";
        }
    });
}


/* ==========================================
   5. MANUAL FILE VERIFICATION
   verify.html
   ========================================== */

if (fileInput && verifyButton && verificationResult) {

    verifyButton.addEventListener("click", async () => {

        const file = fileInput.files[0];

        if (!file) {

            verificationResult.textContent =
                "Please select a file first.";

            return;
        }

        try {

            verificationResult.textContent =
                "Generating fingerprint...";

            const hash = await sha256(file);

            verificationResult.textContent =
                "Checking blockchain record...";

            const contract = await getContract();

            const [exists, owner, timestamp] =
                await contract.verify(hash);

            if (exists) {

                const sealedDate =
                    formatTimestamp(timestamp);

                verificationResult.textContent =
                    "✓ MATCH! Evidence fingerprint found.\n\n" +
                    "SHA-256: " + hash + "\n\n" +
                    "Sealed on: " + sealedDate + "\n\n" +
                    "Sealed by wallet: " + owner;

            } else {

                verificationResult.textContent =
                    "No matching seal. This file was changed after sealing, or it was never sealed.";
            }

        } catch (error) {

            console.error(error);

            verificationResult.textContent =
                "Verification failed: " + error.message;
        }
    });
}


/* ==========================================
   6. AUTOMATIC QR CODE VERIFICATION
   verify.html?hash=...
   ========================================== */

async function verifyHashFromURL() {

    if (!verificationResult) {
        return;
    }

    const params = new URLSearchParams(
        window.location.search
    );

    const hash = params.get("hash");

    if (!hash) {
        return;
    }

    if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {

        verificationResult.textContent =
            "Invalid fingerprint in verification link.";

        return;
    }

    try {

        verificationResult.textContent =
            "Checking blockchain record...";

        const contract = getReadOnlyContract();

        const [exists, owner, timestamp] =
            await contract.verify(hash);

        if (exists) {

            const sealedDate =
                formatTimestamp(timestamp);

            verificationResult.textContent =
                "✓ MATCH! Evidence fingerprint found.\n\n" +
                "SHA-256: " + hash + "\n\n" +
                "Sealed on: " + sealedDate + "\n\n" +
                "Sealed by wallet: " + owner;

        } else {

            verificationResult.textContent =
                "No matching seal found on the blockchain.";
        }

    } catch (error) {

        console.error(error);

        verificationResult.textContent =
            "Automatic verification failed: " + error.message;
    }
}


// Automatically verify when QR URL contains a hash

if (verificationResult) {
    verifyHashFromURL();
}


/* ==========================================
   7. SEAL EVIDENCE ON BLOCKCHAIN
   index.html
   ========================================== */

if (fileInput && sealButton && sealStatus) {

    sealButton.addEventListener("click", async () => {

        const file = fileInput.files[0];

        if (!file) {

            sealStatus.textContent =
                "Please select a file first.";

            return;
        }

        try {

            sealStatus.classList.remove("status-placeholder");

            sealStatus.textContent =
                "Generating file fingerprint...";

            const hash = await sha256(file);

            if (hashOutput) {
                hashOutput.textContent = hash;
            }

            sealStatus.textContent =
                "Connecting to MetaMask...";

            const contract = await getContract();

            sealStatus.textContent =
                "Please confirm the transaction in MetaMask...";

            const tx = await contract.seal(hash);

            sealStatus.textContent =
                "Transaction submitted. Waiting for blockchain confirmation...";

            const receipt = await tx.wait();

            if (!receipt || !receipt.blockNumber) {
                throw new Error(
                    "Blockchain confirmation could not be retrieved."
                );
            }

            // Retrieve confirmed blockchain timestamp

            const provider = new ethers.BrowserProvider(
                window.ethereum
            );

            const block = await provider.getBlock(
                receipt.blockNumber
            );

            if (!block) {
                throw new Error(
                    "Could not retrieve the confirmed block."
                );
            }

            // Store certificate information

            latestCertificateData = {

                fileName: file.name,

                fileHash: hash,

                transactionHash: tx.hash,

                walletAddress:
                    await contract.runner.getAddress(),

                sealedTimestamp:
                    Number(block.timestamp)
            };


            // Reveal certificate section only after confirmation

            if (certificateSection) {
                certificateSection.hidden = false;
            }


            // Update successful sealing status

            const safeFileName = escapeHTML(file.name);

            sealStatus.innerHTML =

                "<strong>✓ Evidence successfully sealed on Sepolia!</strong><br><br>" +

                "<strong>File:</strong> " +
                safeFileName + "<br>" +

                "<strong>SHA-256:</strong> " +
                hash + "<br>" +

                "<strong>Sealed on:</strong> " +
                formatTimestamp(block.timestamp) + "<br>" +

                "<strong>Transaction:</strong> " +
                tx.hash + "<br><br>" +

                '<a href="https://sepolia.etherscan.io/tx/' +
                encodeURIComponent(tx.hash) +
                '" target="_blank" rel="noopener noreferrer">' +

                "View transaction on Etherscan ↗</a>";


            console.log("Transaction receipt:", receipt);

            console.log("Transaction hash:", tx.hash);

            console.log("Certificate data:", latestCertificateData);

        } catch (error) {

            console.error(error);

            if (
                error.message &&
                error.message.includes("Already sealed")
            ) {

                sealStatus.textContent =
                    "This file fingerprint has already been sealed.";

            } else if (
                error.code === "ACTION_REJECTED"
            ) {

                sealStatus.textContent =
                    "Transaction cancelled in MetaMask.";

            } else {

                sealStatus.textContent =
                    "Sealing failed: " + error.message;
            }
        }
    });
}


/* ==========================================
   8. PROOFLOCK PDF CERTIFICATE GENERATOR
   ========================================== */

async function generateCertificate() {

    if (!latestCertificateData) {

        alert(
            "Please seal a file successfully before generating a certificate."
        );

        return;
    }

    if (!window.jspdf || !window.QRCode) {

        throw new Error(
            "PDF or QR-code library could not be loaded."
        );
    }

    const data = latestCertificateData;

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF("p", "mm", "a4");


    // ProofLock colour palette

    const plum = [38, 29, 43];

    const purple = [117, 70, 111];

    const lavender = [181, 138, 182];

    const lightBg = [249, 246, 250];

    const darkText = [49, 39, 51];

    const muted = [115, 103, 118];


    // ======================================
    // PAGE BACKGROUND
    // ======================================

    pdf.setFillColor(...lightBg);

    pdf.rect(0, 0, 210, 297, "F");


    // Outer border

    pdf.setDrawColor(...lavender);

    pdf.setLineWidth(0.7);

    pdf.roundedRect(
        9, 9, 192, 279, 3, 3, "S"
    );


    // ======================================
    // HEADER
    // ======================================

    pdf.setFillColor(...plum);

    pdf.roundedRect(
        10, 10, 190, 49, 3, 3, "F"
    );

    pdf.setTextColor(255, 255, 255);

    pdf.setFont("helvetica", "bold");

    pdf.setFontSize(23);

    pdf.text("PROOFLOCK", 20, 27);


    pdf.setFont("helvetica", "normal");

    pdf.setFontSize(8);

    pdf.setTextColor(218, 199, 221);

    pdf.text(
        "SECURE DIGITAL EVIDENCE VERIFICATION",
        20,
        34
    );


    pdf.setFontSize(17);

    pdf.setTextColor(255, 255, 255);

    pdf.setFont("helvetica", "bold");

    pdf.text(
        "Certificate of Integrity",
        20,
        47
    );


    // Sealed status label

    pdf.setFillColor(75, 111, 83);

    pdf.roundedRect(
        153, 17, 34, 10, 2, 2, "F"
    );

    pdf.setTextColor(255, 255, 255);

    pdf.setFontSize(8);

    pdf.text(
        "SEALED",
        170,
        23.5,
        { align: "center" }
    );


    // ======================================
    // CERTIFICATE REFERENCE
    // ======================================

    const certificateId =
        "PL-" +
        data.transactionHash.slice(2, 10).toUpperCase();


    pdf.setTextColor(...muted);

    pdf.setFontSize(8);

    pdf.text(
        "CERTIFICATE REFERENCE",
        20,
        70
    );


    pdf.setTextColor(...purple);

    pdf.setFont("helvetica", "bold");

    pdf.setFontSize(10);

    pdf.text(
        certificateId,
        20,
        77
    );


    pdf.setDrawColor(220, 209, 222);

    pdf.line(20, 83, 190, 83);


    // ======================================
    // EVIDENCE DETAILS
    // ======================================

    pdf.setTextColor(...purple);

    pdf.setFontSize(11);

    pdf.text(
        "EVIDENCE DETAILS",
        20,
        94
    );


    function addLabel(label, value, y) {

        pdf.setFont("helvetica", "bold");

        pdf.setFontSize(8);

        pdf.setTextColor(...muted);

        pdf.text(
            label.toUpperCase(),
            20,
            y
        );


        pdf.setFont("helvetica", "normal");

        pdf.setFontSize(9);

        pdf.setTextColor(...darkText);


        const lines = pdf.splitTextToSize(
            String(value),
            168
        );

        pdf.text(
            lines,
            20,
            y + 6
        );

        return y + 6 + (lines.length * 4.5);
    }


    let y = 103;


    y = addLabel(
        "File Name",
        data.fileName,
        y
    );

    y += 4;


    y = addLabel(
        "SHA-256 Fingerprint",
        data.fileHash,
        y
    );

    y += 4;


    // Date and network

    pdf.setFont("helvetica", "bold");

    pdf.setFontSize(8);

    pdf.setTextColor(...muted);

    pdf.text("SEALED DATE", 20, y);

    pdf.text("NETWORK", 112, y);


    pdf.setFont("helvetica", "normal");

    pdf.setFontSize(9);

    pdf.setTextColor(...darkText);


    pdf.text(
        formatTimestamp(data.sealedTimestamp),
        20,
        y + 6
    );

    pdf.text(
        "Ethereum Sepolia",
        112,
        y + 6
    );


    y += 18;


    y = addLabel(
        "Wallet Address",
        data.walletAddress,
        y
    );

    y += 4;


    y = addLabel(
        "Blockchain Transaction",
        data.transactionHash,
        y
    );


    // ======================================
    // QR CODE GENERATION
    // ======================================

    const verificationURL = new URL(
        "verify.html",
        window.location.href
    );

    verificationURL.searchParams.set(
        "hash",
        data.fileHash
    );


    const qrContainer = document.getElementById(
        "qrCode"
    );

    if (!qrContainer) {
        throw new Error(
            "QR code container was not found."
        );
    }

    qrContainer.innerHTML = "";


    new QRCode(qrContainer, {

        text: verificationURL.href,

        width: 180,

        height: 180,

        correctLevel: QRCode.CorrectLevel.M
    });


    // Wait for QR generation

    await new Promise(resolve =>
        setTimeout(resolve, 500)
    );


    const qrCanvas = qrContainer.querySelector(
        "canvas"
    );

    const qrImageElement = qrContainer.querySelector(
        "img"
    );


    let qrImage;


    if (qrCanvas) {

        qrImage = qrCanvas.toDataURL("image/png");

    } else if (qrImageElement) {

        qrImage = qrImageElement.src;

    } else {

        throw new Error(
            "Could not generate QR code."
        );
    }


    // ======================================
    // QR VERIFICATION PANEL
    // ======================================

    const qrY = 145;


    pdf.setFillColor(239, 231, 241);

    pdf.roundedRect(
        17, qrY, 176, 43, 3, 3, "F"
    );


    pdf.addImage(
        qrImage,
        "PNG",
        22,
        qrY + 3,
        36,
        36
    );


    pdf.setFont("helvetica", "bold");

    pdf.setFontSize(10);

    pdf.setTextColor(...purple);

    pdf.text(
        "VERIFY THIS CERTIFICATE",
        66,
        qrY + 12
    );


    pdf.setFont("helvetica", "normal");

    pdf.setFontSize(8);

    pdf.setTextColor(...darkText);


    pdf.text(
        "Scan the QR code to check the recorded",
        66,
        qrY + 20
    );

    pdf.text(
        "fingerprint against the Sepolia blockchain.",
        66,
        qrY + 26
    );


    pdf.setFontSize(7);

    pdf.setTextColor(...muted);

    pdf.text(
        "ProofLock | Evidence Verification",
        66,
        qrY + 34
    );


    // ======================================
    // DISCLAIMER AND FOOTER
    // ======================================

    pdf.setDrawColor(220, 209, 222);

    pdf.line(
        20, 269, 190, 269
    );


    pdf.setFont("helvetica", "bold");

    pdf.setFontSize(7);

    pdf.setTextColor(...purple);

    pdf.text(
        "IMPORTANT NOTICE",
        20,
        276
    );


    pdf.setFont("helvetica", "normal");

    pdf.setTextColor(...muted);

    pdf.setFontSize(7);


    const disclaimer =
        "This certificate demonstrates that the file matches the SHA-256 fingerprint recorded at sealing time. It does not establish the original authenticity or truthfulness of the evidence.";


    const disclaimerLines = pdf.splitTextToSize(
        disclaimer,
        168
    );

    pdf.text(
        disclaimerLines,
        20,
        281
    );


    // Download certificate

    pdf.save("ProofLock_Certificate.pdf");
}


/* ==========================================
   9. CERTIFICATE DOWNLOAD BUTTON
   ========================================== */

if (certificateButton) {

    certificateButton.addEventListener(
        "click",
        async () => {

            try {

                certificateButton.disabled = true;

                certificateButton.textContent =
                    "Generating Certificate...";

                await generateCertificate();

            } catch (error) {

                console.error(
                    "Certificate generation error:",
                    error
                );

                alert(
                    "Could not generate certificate: " +
                    error.message
                );

            } finally {

                certificateButton.disabled = false;

                certificateButton.textContent =
                    "Download PDF Certificate";
            }
        }
    );
}
