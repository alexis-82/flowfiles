import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="text-center py-4 bg-gray-100 dark:bg-gray-800">
            <p className="text-gray-500 dark:text-gray-400">© {new Date().getFullYear()} Alessio Abrugiati | Powered by Caffeine and Code</p>
            <a 
                className="justify-center text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400" 
                rel="stylesheet" 
                href="https://www.alexis82.it" 
                target="_blank"
            >
                www.alexis82.it
            </a>
        </footer>
    );
};

export default Footer; 