## 🇮🇹 Italiano

<p align="center">
  <img src="frontend/public/favicon.ico" alt="FlowFiles Logo" width="100" height="100">
</p>

<h1 align="center">FlowFiles</h1>

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
cd flowfiles
```

2. Avviare l'applicazione usando Docker Compose:
```bash
docker-compose up --build
```
oppure

```bash
docker compose up --build
```

Questo comando:
- Costruisce e avvia il container frontend (accessibile sulla porta 80)
- Costruisce e avvia il container backend (accessibile sulla porta 3000)
- Configura le impostazioni di rete necessarie

3. Accedere all'applicazione:
- Aprire il browser e navigare su `http://localhost`
- L'API backend sarà disponibile su `http://localhost:3000`

## Avvio Senza Docker

### Prerequisiti
- Node.js (versione 16 o superiore)
- npm (incluso con Node.js)

### Esecuzione dell'Applicazione

1. Clonare il repository:
```bash
git clone https://github.com/alexis-82/flowfiles.git
cd flowfiles
```

2. Rendere eseguibile lo script start.sh:
```bash
chmod +x start.sh
```

3. Eseguire lo script start.sh:
```bash
./start.sh
```

Lo script:
- Verifica la presenza delle directory necessarie
- Installa le dipendenze del frontend e del backend
- Compila entrambe le applicazioni
- Avvia il backend sulla porta 3000
- Avvia il frontend sulla porta predefinita
- Gestisce automaticamente l'arresto dei servizi quando si termina lo script


---

## 🇬🇧 English

<p align="center">
  <img src="frontend/public/favicon.ico" alt="FlowFiles Logo" width="100" height="100">
</p>

<h1 align="center">FlowFiles</h1>

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
cd flowfiles
```

2. Start the application using Docker Compose:
```bash
docker-compose up --build
```
or

```bash
docker compose up --build
```

This will:
- Build and start the frontend container (accessible on port 80)
- Build and start the backend container (accessible on port 3000)
- Set up the necessary network configurations

3. Access the application:
- Open your browser and navigate to `http://localhost`
- The backend API will be available at `http://localhost:3000`

## Running Without Docker

### Prerequisites
- Node.js (version 16 or higher)
- npm (included with Node.js)

### Running the Application

1. Clone the repository:
```bash
git clone https://github.com/alexis-82/flowfiles.git
cd flowfiles
```

2. Make the start.sh script executable:
```bash
chmod +x start.sh
```

3. Run the start.sh script:
```bash
./start.sh
```

The script will:
- Check for required directories
- Install frontend and backend dependencies
- Build both applications
- Start the backend on port 3000
- Start the frontend on the default port
- Automatically handle service shutdown when the script is terminated

## License

This project is licensed under the terms of the included license file.

---

## Screenshot

[![flowfiles.png](https://i.postimg.cc/QCMJn5xg/flowfiles.png)](hhttps://i.postimg.cc/QCMJn5xg/flowfiles.png)
