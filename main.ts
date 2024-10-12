import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
    findMetadataPda,
    createMetadataAccountV3,
} from "@metaplex-foundation/mpl-token-metadata";
import {
    fromWeb3JsPublicKey,
    toWeb3JsInstruction
} from "@metaplex-foundation/umi-web3js-adapters";
import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    clusterApiUrl,
    sendAndConfirmTransaction,
} from "@solana/web3.js";
import { Instruction, createNoopSigner, signerIdentity } from "@metaplex-foundation/umi";
import {CONFIG} from "./config";
import * as fs from "fs"

fs.readFile(CONFIG.walletPath, 'utf8', function (err, data) {
    // Display the file content
    var key: [] = JSON.parse(data);

    main(key).then(() => {
        console.log("add metadata success")
    }).catch((err) => {
        console.log(err)
    })
});

async function main(privateKey: []) {
    // Use existing keypairs or generate new ones if they don't exist
    const wallet_1 = Keypair.fromSecretKey(new Uint8Array(privateKey));
    const mySigner = createNoopSigner(fromWeb3JsPublicKey(wallet_1.publicKey));

    //Connection and Umi instance
    const endpoint = clusterApiUrl("devnet");
    const umi = createUmi(endpoint, "confirmed");

    umi.use(signerIdentity(mySigner));
    const connection = new Connection(endpoint, "confirmed");
    
    // Generate keypair to use as address of token account
    const mintAddress = new PublicKey(CONFIG.tokenMint);
    
    const metadataAccountAddress = findMetadataPda(umi, {
      mint: fromWeb3JsPublicKey(mintAddress),
    });
    
    // Create the Metadata account for the Mint
    const transactionBuilder = createMetadataAccountV3(umi, {
      metadata: metadataAccountAddress,
      mint: fromWeb3JsPublicKey(mintAddress),
      mintAuthority: mySigner,
      payer: mySigner,
      updateAuthority: mySigner.publicKey,
      data: {
        creators: null,
        name: CONFIG.tokenMetadata.name,
        symbol: CONFIG.tokenMetadata.symbol,
        uri: CONFIG.tokenMetadata.uri,
        sellerFeeBasisPoints: 0,
        collection: null,
        uses: null,
      },
      collectionDetails: null,
      isMutable: true,
    });
    
    const ix: Instruction = transactionBuilder.getInstructions()[0];
    
    // Build transaction with instructions to create new account and initialize mint account
    const transaction = new Transaction().add(
      toWeb3JsInstruction(ix)
    );
    
    const transactionSignature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [
        wallet_1 // payer
      ]
    );   
    console.log("Signature: ", transactionSignature)
}