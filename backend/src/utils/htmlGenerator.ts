interface ServerInfo {
    name: string;
    version: string;
    status: string;
    endpoints: {
        [key: string]: string;
    };
    timestamp: string;
}

export const generateServerInfoHtml = (): { serverInfo: ServerInfo; html: string } => {
    const serverInfo = {
        name: 'Login Server API',
        version: '1.0.0',
        status: 'online',
        endpoints: {
            files: '/api/files [GET]',
            delete: '/api/files/:filename [DELETE]',
            update: '/api/files/upload [POST]'
        },
        timestamp: new Date().toISOString()
    }

    const html = `
        <!DOCTYPE html>
        <html lang="it">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${serverInfo.name}</title>
            <link rel="stylesheet" href="/styles/server.css">
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>${serverInfo.name}</h1>
                    <h3>Status</h3>
                    <span class="status">${serverInfo.status}</span>
                </div>
                <div class="endpoints">
                    <h2>Endpoints disponibili:</h2>
                    ${Object.entries(serverInfo.endpoints).map(([name, path]) => `
                        <div class="endpoint">
                            <strong>${name}</strong>: ${path}
                        </div>
                    `).join('')}
                </div>
                <div class="timestamp">
                    Ultimo aggiornamento: ${new Date(serverInfo.timestamp).toLocaleString('it-IT')}
                </div>
            </div>
        </body>
        </html>
    `

    return { serverInfo, html }
}
