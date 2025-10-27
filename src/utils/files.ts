export function validateFiles(accept: string[], files: File[]) {
  if (!accept?.length) {
    return { valid: files, invalid: [] };
  }

  const acceptTypes = Array.isArray(accept) ? accept : [accept];
  const valid: File[] = [];
  const invalid: File[] = [];

  // Comprehensive MIME type groups for better validation
  const mimeGroups: Record<string, string[]> = {
    image: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/bmp',
      'image/tiff',
      'image/heic',
      'image/heif',
      'image/avif',
      'image/avif-sequence',
      'image/x-icns',
      'image/x-icon',
      'image/vnd.microsoft.icon',
      'image/vnd.adobe.photoshop',
      'image/x-adobe-dng',
      'image/x-sony-arw',
      'image/x-canon-cr2',
      'image/x-canon-crw',
      'image/x-kodak-dcr',
      'image/x-epson-erf',
      'image/x-kodak-k25',
      'image/x-kodak-kdc',
      'image/x-minolta-mrw',
      'image/x-nikon-nef',
      'image/x-olympus-orf',
      'image/x-pentax-pef',
      'image/x-fuji-raf',
      'image/x-panasonic-raw',
      'image/x-sony-sr2',
      'image/x-sony-srf',
      'image/x-sigma-x3f',
      'image/pjpeg',
      'image/x-portable-bitmap',
      'image/x-portable-graymap',
      'image/x-portable-pixmap',
      'image/x-rgb',
      'image/x-xbitmap',
      'image/x-xpixmap',
      'image/x-xwindowdump',
      'image/vnd.wap.wbmp',
      'image/vnd.ms-modi',
      'image/cgm',
      'image/vnd.dwg',
      'image/vnd.dxf',
      'image/vnd.fastbidsheet',
      'image/vnd.fpx',
      'image/vnd.net-fpx',
      'image/vnd.xiff',
      'image/x-cmu-raster',
      'image/x-cmx',
      'image/x-freehand',
      'image/x-pict',
      'image/x-pcx',
      'image/vnd.djvu',
      'image/g3fax',
      'image/ief',
      'image/prs.btif'
    ],
    audio: [
      'audio/mpeg',
      'audio/mp4',
      'audio/ogg',
      'audio/wav',
      'audio/vnd.wav',
      'audio/webm',
      'audio/aac',
      'audio/flac',
      'audio/midi',
      'audio/x-midi',
      'audio/opus',
      'audio/3gpp',
      'audio/3gpp2',
      'audio/aacp',
      'audio/mp4a-latm',
      'audio/basic',
      'audio/x-aiff',
      'audio/aiff',
      'audio/x-mpegurl',
      'audio/vnd.digital-winds',
      'audio/vnd.dts',
      'audio/vnd.dts.hd',
      'audio/vnd.lucent.voice',
      'audio/vnd.ms-playready.media.pya',
      'audio/vnd.nuera.ecelp4800',
      'audio/vnd.nuera.ecelp7470',
      'audio/vnd.nuera.ecelp9600',
      'audio/adpcm',
      'audio/x-ms-wma',
      'audio/x-ms-wax',
      'audio/x-pn-realaudio',
      'audio/x-pn-realaudio-plugin',
      'audio/vnd.rn-realaudio'
    ],
    video: [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
      'video/x-msvideo',
      'video/mpeg',
      'video/3gpp',
      'video/3gpp2',
      'video/h261',
      'video/h263',
      'video/h264',
      'video/jpeg',
      'video/jpm',
      'video/mj2',
      'video/mp2t',
      'video/x-f4v',
      'video/x-fli',
      'video/x-flv',
      'video/x-m4v',
      'video/x-matroska',
      'video/x-ms-asf',
      'video/x-ms-wm',
      'video/x-ms-wmv',
      'video/x-ms-wmx',
      'video/x-ms-wvx',
      'video/x-sgi-movie',
      'video/vnd.dece.hd',
      'video/vnd.dece.mobile',
      'video/vnd.dece.pd',
      'video/vnd.dece.sd',
      'video/vnd.dece.video',
      'video/vnd.fvt',
      'video/vnd.mpegurl',
      'video/vnd.ms-playready.media.pyv',
      'video/vnd.uvvu.mp4',
      'video/vnd.vivo'
    ],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.ms-excel',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/rtf',
      'application/vnd.oasis.opendocument.text',
      'application/vnd.oasis.opendocument.spreadsheet',
      'application/vnd.oasis.opendocument.presentation',
      'application/vnd.ms-excel.sheet.macroenabled.12',
      'application/vnd.ms-word.document.macroenabled.12',
      'application/vnd.ms-powerpoint.presentation.macroenabled.12',
      'text/csv',
      'text/markdown',
      'text/html',
      'application/xhtml+xml',
      'application/vnd.wordperfect',
      'application/epub+zip',
      'application/vnd.visio'
    ],
    archive: [
      'application/zip',
      'application/x-zip-compressed',
      'application/x-7z-compressed',
      'application/x-rar-compressed',
      'application/vnd.rar',
      'application/x-tar',
      'application/x-gzip',
      'application/gzip',
      'application/x-bzip2',
      'application/x-bzip',
      'application/x-stuffit',
      'application/x-stuffitx',
      'application/x-ace-compressed',
      'application/x-cpio',
      'application/x-gtar'
    ],
    code: [
      'text/javascript',
      'application/json',
      'application/xml',
      'text/xml',
      'application/x-sh',
      'application/x-shellscript',
      'text/x-python',
      'text/x-java-source',
      'text/x-c',
      'text/x-pascal',
      'text/x-asm',
      'application/prql',
      'application/yaml',
      'text/css'
    ],
    font: [
      'font/woff',
      'font/woff2',
      'font/otf',
      'application/x-font-otf',
      'application/x-font-ttf',
      'application/x-font-bdf',
      'application/x-font-ghostscript',
      'application/x-font-linux-psf',
      'application/x-font-pcf',
      'application/x-font-snf',
      'application/font-tdpfr'
    ],
    model: [
      'model/mesh',
      'model/vnd.gdl',
      'model/vnd.gtw',
      'model/vnd.mts',
      'model/vnd.vtu',
      'model/vrml'
    ]
  };

  // Comprehensive mapping of extensions to MIME types
  const extensionToMime: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.jpe': 'image/jpeg',
    '.jfif': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff',
    '.ico': 'image/x-icon',
    '.avif': 'image/avif',
    '.avifs': 'image/avif-sequence',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx':
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.m4a': 'audio/mp4',
    '.m4v': 'video/x-m4v',
    '.wav': 'audio/wav',
    '.weba': 'audio/webm',
    '.webm': 'video/webm',
    '.ogg': 'audio/ogg',
    '.ogv': 'video/ogg',
    '.oga': 'audio/ogg',
    '.opus': 'audio/opus',
    '.flac': 'audio/flac',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.md': 'text/markdown',
    '.markdown': 'text/markdown',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.zip': 'application/zip',
    '.7z': 'application/x-7z-compressed',
    '.rar': 'application/vnd.rar',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
    '.tgz': 'application/gzip',
    '.bz2': 'application/x-bzip2',
    '.bz': 'application/x-bzip',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.otf': 'font/otf',
    '.ttf': 'application/x-font-ttf',
    '.css': 'text/css',
    '.rtf': 'application/rtf',
    '.odt': 'application/vnd.oasis.opendocument.text',
    '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
    '.odp': 'application/vnd.oasis.opendocument.presentation',
    '.py': 'text/x-python',
    '.c': 'text/x-c',
    '.cpp': 'text/x-c',
    '.h': 'text/x-c',
    '.java': 'text/x-java-source',
    '.sh': 'application/x-shellscript',
    '.yaml': 'application/yaml',
    '.yml': 'application/yaml',
    '.prql': 'application/prql',
    '.epub': 'application/epub+zip',
    '.3gp': 'video/3gpp',
    '.3g2': 'video/3gpp2',
    '.ts': 'video/mp2t',
    '.mov': 'video/quicktime',
    '.qt': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.wmv': 'video/x-ms-wmv',
    '.mpg': 'video/mpeg',
    '.mpeg': 'video/mpeg',
    '.mkv': 'video/x-matroska',
    '.mka': 'audio/x-matroska',
    '.dng': 'image/x-adobe-dng',
    '.arw': 'image/x-sony-arw',
    '.cr2': 'image/x-canon-cr2',
    '.crw': 'image/x-canon-crw',
    '.nef': 'image/x-nikon-nef',
    '.orf': 'image/x-olympus-orf',
    '.pef': 'image/x-pentax-pef',
    '.raf': 'image/x-fuji-raf',
    '.raw': 'image/x-panasonic-raw',
    '.rw2': 'image/x-panasonic-raw',
    '.rwl': 'image/x-panasonic-raw',
    '.sr2': 'image/x-sony-sr2',
    '.srf': 'image/x-sony-srf',
    '.x3f': 'image/x-sigma-x3f',
    '.db': 'application/vnd.sqlite3',
    '.sqlite': 'application/vnd.sqlite3',
    '.sqlite3': 'application/vnd.sqlite3',
    '.vsd': 'application/vnd.visio',
    '.vsdx': 'application/vnd.visio',
    '.wasm': 'application/wasm',
    '.aiff': 'audio/aiff',
    '.aif': 'audio/aiff',
    '.mid': 'audio/midi',
    '.midi': 'audio/midi',
    '.iso': 'application/x-iso9660-image'
  };

  // Process each file to determine if it's valid
  files.forEach((file) => {
    let isValid = false;

    // Try to determine MIME type from file extension if not available
    let fileExtension = '';
    if (file.name.lastIndexOf('.') !== -1) {
      fileExtension = file.name
        .substring(file.name.lastIndexOf('.'))
        .toLowerCase();
    }

    const fileType = file.type || extensionToMime[fileExtension] || '';

    for (const type of acceptTypes) {
      // Handle exact match first
      if (type === fileType) {
        isValid = true;
        break;
      }

      // Handle wildcard patterns (e.g., "image/*")
      if (type.includes('*')) {
        const [mainType, subType] = type.split('/');

        // Handle any file type
        if (mainType === '*') {
          isValid = true;
          break;
        }

        // Handle specific type with any subtype (e.g., "image/*")
        if (subType === '*' && fileType.startsWith(mainType + '/')) {
          isValid = true;
          break;
        }

        // Handle known MIME group patterns
        if (
          subType === '*' &&
          mainType &&
          mainType in mimeGroups &&
          Array.isArray(mimeGroups[mainType]) &&
          mimeGroups[mainType].includes(fileType)
        ) {
          isValid = true;
          break;
        }
      }

      // Handle file extensions
      if (type.startsWith('.')) {
        const extension = type.toLowerCase();
        const fileName = file.name.toLowerCase();

        if (fileName.endsWith(extension)) {
          isValid = true;
          break;
        }
      }

      // Handle known MIME type groups by name (e.g., "image")
      if (mimeGroups[type]?.includes(fileType)) {
        isValid = true;
        break;
      }

      // Check if the extension maps to an acceptable MIME type
      if (
        fileExtension &&
        extensionToMime[fileExtension] &&
        type === extensionToMime[fileExtension]
      ) {
        isValid = true;
        break;
      }
    }

    isValid ? valid.push(file) : invalid.push(file);
  });

  return { valid, invalid };
}
