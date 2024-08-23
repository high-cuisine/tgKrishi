const {
    TelegramClient,
    Api
} = require("telegram");
const {
    StringSession
} = require("telegram/sessions");
const input = require('input');
const fs = require('fs');
const path = require('path');
const express = require('express');
const Buffer = require('Buffer');
const cors = require('cors');

const app = express();

app.use(cors());


const PORT = 3000;

const TOKEN = '7440948870:AAH667AegMq2jbyxp9E-uHSbFTqLzp4qiRU';
const BASE_URL = `https://api.telegram.org/bot${TOKEN}/`;

const apiId = 23646692;
const apiHash = 'ce9d84eb1daf3beeb5238f56ba758a80';
const sessionTxtPath = path.join(__dirname, 'session.txt');
app.use(express.json());

let client;
let channel;

async function getSession() {
    if (fs.existsSync(sessionTxtPath)) {
        return new StringSession(fs.readFileSync(sessionTxtPath, 'utf8'));
    } else {
        return new StringSession("");
    }
}

async function saveImageFromMedia(media) {
    if (media.document && media.document.fileReference) {
        const imageData = media.document.fileReference;
        fs.writeFileSync('image.jpg', imageData);
        console.log('Image saved as image.jpg');
        return 'image.jpg'; 
    } else {
        throw new Error('Media does not contain a document with fileReference');
    }
}

async function getMessagesFromChannel() {
    try {
        const messageList = [];
        const response = await client.getMessages(channel, { limit: 30 });

        for (const el of response) {
            if (el.media) {
                try {
                    const imageLink = await client.downloadMedia(el.media);

                    console.log(imageLink);
                    messageList.push({
                        imageLink,
                        message: el.message,
                    });
                } catch (error) {
                    console.error('Error saving image:', error.message);
                }
            } else {
                messageList.push({
                    imageLink: 'none',
                    message: el.message,
                });
            }
        }
        
        return messageList;
    } catch (e) {
        console.error('Error in getMessagesFromChannel:', e);
        throw e;
    }
}

app.get('/getPosts', async (req, res) => {
    try {
        const messages = await getMessagesFromChannel();
        res.json(messages);
    } catch (e) {
        console.error('Error in getPosts endpoint:', e);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(PORT, async () => {
    console.log('Server is running on port', PORT);
    const stringSession = await getSession();
    console.log("Loading interactive example...");

    client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });

    if (stringSession.value === "") {
        await client.start({
            phoneNumber: async () => await input.text("Please enter your number: "),
            password: async () => await input.text("Please enter your password: "),
            phoneCode: async () => await input.text("Please enter the code you received: "),
            onError: (err) => console.log(err),
        });
        fs.writeFileSync(sessionTxtPath, client.session.save());
    } else {
        await client.connect();
    }

    console.log("You are now connected.");
    console.log(`StringSession: ${client.session.save()}`);

    channel = await client.getEntity(-1002149003573);
});
