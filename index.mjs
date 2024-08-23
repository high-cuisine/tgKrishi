import fetch from 'node-fetch';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

const TOKEN = '7440948870:AAH667AegMq2jbyxp9E-uHSbFTqLzp4qiRU';
const BASE_URL = `https://api.telegram.org/bot${TOKEN}/`;

app.use(cors({
    origin: 'https://krovelnayalatka.ru'
}));

async function getUpdates(offset = null) {
    try {
        const response = await fetch(`${BASE_URL}getUpdates?offset=${offset}`);
        const data = await response.json();

        if (data.ok) {
            return data.result;
        } else {
            console.error('Error fetching updates:', data);
            return [];
        }
    } catch (error) {
        console.error('Error fetching updates:', error);
        return [];
    }
}

async function getFileLink(fileId) {
    try {
        const response = await fetch(`${BASE_URL}getFile?file_id=${fileId}`);
        const data = await response.json();

        if (data.ok) {
            return `https://api.telegram.org/file/bot${TOKEN}/${data.result.file_path}`;
        } else {
            console.error('Error getting file link:', data);
            return null;
        }
    } catch (error) {
        console.error('Error getting file link:', error);
        return null;
    }
}

async function collectMessagesWithLinks(chatId, limit = 400) {
    const updates = await getUpdates();
    if (updates.length === 0) {
        console.log('No messages found.');
        return [];
    }

    const channelPosts = updates
        .filter(update => update.channel_post && update.channel_post.chat.id === chatId)
        .sort((a, b) => b.update_id - a.update_id)
        .slice(0, limit)
        .map(update => update.channel_post);

    const messagesWithLinks = [];

    for (const message of channelPosts) {
        const messageDate = message.date;
        const date = new Date(messageDate * 1000);
        const readableDate = date.toLocaleDateString();

        const messageWithLink = {
            message: message.text || message.caption || null,
            imageLink: null,
            date: readableDate
        };

        if (message.photo) {
            const fileId = message.photo[message.photo.length - 1].file_id;
            const fileLink = await getFileLink(fileId);
            messageWithLink.imageLink = fileLink;
        }

        messagesWithLinks.push(messageWithLink);
    }

    return messagesWithLinks;
}

app.get('/getPosts', async (req, res) => {
    try {
        const chatId = -1002149003573; 
        const messagesWithLinks = await collectMessagesWithLinks(chatId);
        res.json(messagesWithLinks);
    } catch (e) {
        console.error('Error in getPosts endpoint:', e);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(PORT, () => {
    console.log('Server is running on port', PORT);
});