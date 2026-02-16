
const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const path = require('path');

const dir = process.cwd();
const repoUrl = 'https://github.com/genercast-unitech/bash.git';
const token = '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';

async function push() {
    try {
        console.log('Initializing repository...');
        await git.init({ fs, dir });

        console.log('Adding specific files...');
        const wppFiles = ['whatsapp-server/Dockerfile', 'whatsapp-server/server.js', 'whatsapp-server/package.json'];
        for (const f of wppFiles) {
            const normalizedPath = f.split('/').join(path.sep);
            await git.add({ fs, dir, filepath: normalizedPath });
        }

        console.log('Committing changes...');
        await git.commit({
            fs,
            dir,
            author: {
                name: 'Geneilson Fernandes',
                email: 'gener-cell@hotmail.com'
            },
            message: 'Updating WhatsApp Server Config'
        });

        console.log('Pushing to GitHub...');
        await git.addRemote({ fs, dir, remote: 'origin', url: repoUrl });
        await git.push({
            fs,
            http,
            dir,
            remote: 'origin',
            ref: 'HEAD',
            remoteRef: 'production',
            force: true,
            onAuth: () => ({ username: token })
        });

        console.log('Success! Code pushed to GitHub.');
    } catch (err) {
        console.error('Error during push:', err);
        process.exit(1);
    }
}

push();
