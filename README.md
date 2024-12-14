## 🇮🇹 Italiano

# Applicazione File Browser

Un'applicazione web moderna per la navigazione dei file costruita con React e Node.js, che permette agli utenti di sfogliare e gestire i file attraverso un'interfaccia intuitiva e pulita.

## Caratteristiche

- Navigazione di file
- Visualizzazione dei dettagli e delle proprietà dei file
- Interfaccia utente moderna e responsive
- Backend API RESTful
- Distribuzione containerizzata con Docker

## Stack Tecnologico

### Frontend
- React con TypeScript
- Componenti UI moderni
- Servizi di gestione file
- Design responsive

### Backend
- Node.js con TypeScript
- Express.js per API REST
- Operazioni sul file system
- Gestione sicura dei file

## Iniziare con Docker

### Prerequisiti

- Docker
- Docker Compose

### Esecuzione dell'Applicazione

1. Clonare il repository:
```bash
git clone https://github.com/alexis-82/flowfiles.git
cd file_browser
```

2. Avviare l'applicazione usando Docker Compose:
```bash
docker-compose up --build
```

Questo comando:
- Costruisce e avvia il container frontend (accessibile sulla porta 80)
- Costruisce e avvia il container backend (accessibile sulla porta 3000)
- Configura le impostazioni di rete necessarie

3. Accedere all'applicazione:
- Aprire il browser e navigare su `http://localhost`
- L'API backend sarà disponibile su `http://localhost:3000`

### Sviluppo

Per eseguire l'applicazione in modalità sviluppo:

1. Frontend (dalla directory frontend):
```bash
npm install
npm run dev
```

2. Backend (dalla directory backend):
```bash
npm install
npm run dev
```

## Struttura del Progetto

```
file_browser/
├── frontend/           # Applicazione frontend React
├── backend/           # Applicazione backend Node.js
├── docker-compose.yaml # Configurazione Docker compose
└── README.md          # Documentazione del progetto
```

## Configurazione Docker

L'applicazione utilizza Docker Compose per gestire due servizi:

1. Servizio Frontend:
   - Build dal Dockerfile frontend
   - Serve l'applicazione React
   - Esposto sulla porta 80
   - Configurato per comunicare con il servizio backend

2. Servizio Backend:
   - Build dal Dockerfile backend
   - Esegue il server API Node.js
   - Esposto sulla porta 3000
   - Gestisce le operazioni sul file system

## Contribuire

1. Fai il fork del repository
2. Crea il tuo branch per la feature
3. Committa le tue modifiche
4. Pusha sul branch
5. Crea una nuova Pull Request

---

## 🇬🇧 English

# File Browser Application

A modern web-based file browser application built with React and Node.js, allowing users to browse and manage files through a clean and intuitive interface.

## Features

- Browse files
- View file details and properties
- Modern and responsive user interface
- RESTful API backend
- Containerized deployment with Docker

## Technology Stack

### Frontend
- React with TypeScript
- Modern UI components
- File management services
- Responsive design

### Backend
- Node.js with TypeScript
- Express.js for REST API
- File system operations
- Secure file handling

## Getting Started with Docker

### Prerequisites

- Docker
- Docker Compose

### Running the Application

1. Clone the repository:
```bash
git clone https://github.com/alexis-82/flowfiles.git
cd file_browser
```

2. Start the application using Docker Compose:
```bash
docker-compose up --build
```

This will:
- Build and start the frontend container (accessible on port 80)
- Build and start the backend container (accessible on port 3000)
- Set up the necessary network configurations

3. Access the application:
- Open your browser and navigate to `http://localhost`
- The backend API will be available at `http://localhost:3000`

### Development

To run the application in development mode:

1. Frontend (from the frontend directory):
```bash
npm install
npm run dev
```

2. Backend (from the backend directory):
```bash
npm install
npm run dev
```

## Project Structure

```
file_browser/
├── frontend/           # React frontend application
├── backend/           # Node.js backend application
├── docker-compose.yaml # Docker composition configuration
└── README.md          # Project documentation
```

## Docker Configuration

The application uses Docker Compose to manage two services:

1. Frontend Service:
   - Builds from the frontend Dockerfile
   - Serves the React application
   - Exposed on port 80
   - Configured to communicate with the backend service

2. Backend Service:
   - Builds from the backend Dockerfile
   - Runs the Node.js API server
   - Exposed on port 3000
   - Handles file system operations

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the terms of the included license file.

---

## Screenshot

[![flowfiles.png](https://i.postimg.cc/QCMJn5xg/flowfiles.png)](https://postimg.cc/CBW8RR8d)