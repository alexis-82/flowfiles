import React from 'react';
import { FaDocker, FaGit, FaRegFilePdf } from 'react-icons/fa';
import { GrDocumentTxt } from 'react-icons/gr';
import { RiFileExcel2Line, RiFileWord2Line } from 'react-icons/ri';
import { Si7Zip, SiDotenv, SiHtml5, SiJavascript, SiPython, SiTypescript } from 'react-icons/si';
import { 
    BsFileEarmarkCode,
    BsFiletypeExe,
    BsFiletypeMp3,
    BsFiletypeMp4,
    BsFiletypeSql
} from 'react-icons/bs';
import {
    TbUpload,
    TbFileText,
    TbPhoto,
    TbFolderDown,
    TbEdit,
    TbPackage,
    TbAppWindow,
    TbTerminal2,
    TbFileZip,
    TbMusic,
    TbFile,
    TbFileTypeCss,
    TbZip
} from "react-icons/tb";

interface IconProps {
    className?: string;
    size?: number;
}

// ICONA DEL DRAG AND DROP
export const DiskUploadIcon: React.FC<IconProps> = ({ size = 32 }) => (
    <TbUpload size={size} className="text-gray-400" />
);

export const TrashIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

export const RestoreIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

export const DownloadIcon: React.FC<IconProps> = ({ className = "w-5 h-5" }) => (
    <TbFolderDown className={className} />
);

export const FileIcon: React.FC<{ filename: string; className?: string }> = ({ filename, className = "w-5 h-5" }) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    const props = { className: `${className} text-gray-500` };

    switch (extension) {
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'bmp':
        case 'tiff':
        case 'ico':
        case 'svg':
        case 'webp':
            return <TbPhoto {...props} />;
        case 'txt':
            return <GrDocumentTxt {...props} />;
        case 'pdf':
            return <FaRegFilePdf {...props} />;
        case 'doc':
        case 'docx':
            return <RiFileWord2Line {...props} />;
        case 'xls':
        case 'xlsx':
            return <RiFileExcel2Line {...props} />;
        case 'ppt':
        case 'pptx':
            return <TbFileText {...props} />;
        case 'ts':
        case 'tsx':
            return <SiTypescript {...props} />;
        case 'jsx':
        case 'js':
            return <SiJavascript {...props} />;
        case 'py':
        case 'pyw':
        case 'pyc':
        case 'pyo':
        case 'pyd':
        case 'pyi':
        case 'pyt':
        case 'pyz':
            return <SiPython {...props} />;
        case 'css':
            return <TbFileTypeCss {...props} />;
        case 'html':
            return <SiHtml5 {...props} />;
        case 'xml':
        case 'yml':
        case 'yaml':
        case 'cs':
        case 'json':
        case 'md':
        case 'cpp':
        case 'xaml':
            return <BsFileEarmarkCode {...props} />;
        case 'sql':
        case 'db':
        case 'sdb':
        case 'sqlite':
            return <BsFiletypeSql {...props} />;
        case 'exe':
            return <BsFiletypeExe {...props} />;
        case 'msi':
        case 'app':
            return <TbAppWindow {...props} />;
        case 'bat':
        case 'cmd':
        case 'sh':
        case 'ps1':
        case 'psm1':
        case 'psd1':
        case 'ps1xml':
        case 'pssc':
            return <TbTerminal2 {...props} />;
        case 'zip':
            return <TbZip {...props} />;
        case '7z':
            return <Si7Zip {...props} />;
        case 'rpm':
        case 'pkg':
        case 'deb':
        case 'iso':
        case 'dmg':
            return <TbPackage {...props} />;
        case 'gz':
        case 'tar':
        case 'bz2':
        case 'xz':
        case 'rar':
            return <TbFileZip {...props} />;
        case 'mp3':
            return <BsFiletypeMp3 {...props} />;
        case 'mp4':
            return <BsFiletypeMp4 {...props} />;
        case 'wav':
        case 'wma':
        case 'aac':
        case 'flac':
            return <TbMusic {...props} />;
        case 'gitignore':
        case 'gitkeep':
            return <FaGit {...props} />;
        case 'dockerignore':
        case 'dockerfile':
        case 'Dockerfile':
        case 'docker-compose.yml':
        case 'docker-compose.yaml':
            return <FaDocker {...props} />;
        case 'env':
            return <SiDotenv {...props} />;
        default:
            return <TbFile {...props} />;
    }
};

export const RenameIcon: React.FC<IconProps> = ({ className = "w-5 h-5" }) => (
    <TbEdit className={className} />
);
