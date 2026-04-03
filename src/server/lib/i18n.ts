export const SUPPORTED_LOCALES = ["en", "es"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

type TranslationKeys = {
  // Common
  "common.save": string;
  "common.cancel": string;
  "common.delete": string;
  "common.edit": string;
  "common.add": string;
  "common.search": string;
  "common.loading": string;
  "common.error": string;
  "common.success": string;
  "common.confirm": string;
  "common.back": string;
  "common.next": string;
  "common.retry": string;
  "common.upload": string;
  "common.download": string;
  "common.actions": string;
  "common.status": string;
  "common.noResults": string;

  // Auth
  "auth.login": string;
  "auth.password": string;
  "auth.loginTitle": string;
  "auth.loginDescription": string;
  "auth.invalidPassword": string;
  "auth.logout": string;

  // Nav
  "nav.dashboard": string;
  "nav.accounts": string;
  "nav.posts": string;
  "nav.newPost": string;
  "nav.import": string;
  "nav.templates": string;
  "nav.settings": string;

  // Dashboard
  "dashboard.title": string;
  "dashboard.scheduledToday": string;
  "dashboard.publishedToday": string;
  "dashboard.pending": string;
  "dashboard.failed": string;
  "dashboard.recentPosts": string;
  "dashboard.accountHealth": string;
  "dashboard.noPostsToday": string;

  // Accounts
  "accounts.title": string;
  "accounts.addAccount": string;
  "accounts.connectInstagram": string;
  "accounts.noAccounts": string;
  "accounts.tokenValid": string;
  "accounts.tokenExpiring": string;
  "accounts.tokenExpired": string;
  "accounts.active": string;
  "accounts.inactive": string;
  "accounts.postsToday": string;
  "accounts.scheduledCount": string;
  "accounts.removeConfirm": string;
  "accounts.postingConfig": string;
  "accounts.maxPostsPerDay": string;
  "accounts.postingWindows": string;
  "accounts.timezone": string;
  "accounts.minGap": string;

  // Posts
  "posts.title": string;
  "posts.createPost": string;
  "posts.caption": string;
  "posts.hashtags": string;
  "posts.mediaType": string;
  "posts.image": string;
  "posts.carousel": string;
  "posts.reel": string;
  "posts.scheduleDate": string;
  "posts.scheduleTime": string;
  "posts.account": string;
  "posts.selectAccount": string;
  "posts.draft": string;
  "posts.scheduled": string;
  "posts.publishing": string;
  "posts.published": string;
  "posts.failed": string;
  "posts.retryPost": string;
  "posts.deleteConfirm": string;
  "posts.captionPlaceholder": string;
  "posts.hashtagsPlaceholder": string;

  // Media
  "media.upload": string;
  "media.dragDrop": string;
  "media.orBrowse": string;
  "media.googleDrive": string;
  "media.googleDriveUrl": string;
  "media.fetchFromUrl": string;
  "media.maxImageSize": string;
  "media.maxVideoSize": string;
  "media.supportedFormats": string;

  // Import
  "import.title": string;
  "import.uploadCsv": string;
  "import.downloadTemplate": string;
  "import.step1Upload": string;
  "import.step2Validate": string;
  "import.step3Preview": string;
  "import.step4Confirm": string;
  "import.validationErrors": string;
  "import.validRows": string;
  "import.invalidRows": string;
  "import.confirmImport": string;

  // Templates
  "templates.title": string;
  "templates.createTemplate": string;
  "templates.name": string;
  "templates.captionTemplate": string;
  "templates.defaultHashtags": string;
  "templates.noTemplates": string;

  // Language
  "language.switch": string;
  "language.en": string;
  "language.es": string;
};

const translations: Record<Locale, TranslationKeys> = {
  en: {
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.add": "Add",
    "common.search": "Search",
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    "common.confirm": "Confirm",
    "common.back": "Back",
    "common.next": "Next",
    "common.retry": "Retry",
    "common.upload": "Upload",
    "common.download": "Download",
    "common.actions": "Actions",
    "common.status": "Status",
    "common.noResults": "No results found",

    "auth.login": "Login",
    "auth.password": "Password",
    "auth.loginTitle": "Instagram Scheduler",
    "auth.loginDescription": "Enter your password to continue",
    "auth.invalidPassword": "Invalid password",
    "auth.logout": "Logout",

    "nav.dashboard": "Dashboard",
    "nav.accounts": "Accounts",
    "nav.posts": "Posts",
    "nav.newPost": "New Post",
    "nav.import": "Import",
    "nav.templates": "Templates",
    "nav.settings": "Settings",

    "dashboard.title": "Dashboard",
    "dashboard.scheduledToday": "Scheduled Today",
    "dashboard.publishedToday": "Published Today",
    "dashboard.pending": "Pending",
    "dashboard.failed": "Failed",
    "dashboard.recentPosts": "Recent Posts",
    "dashboard.accountHealth": "Account Health",
    "dashboard.noPostsToday": "No posts scheduled for today",

    "accounts.title": "Accounts",
    "accounts.addAccount": "Add Account",
    "accounts.connectInstagram": "Connect Instagram Account",
    "accounts.noAccounts": "No accounts connected. Add your first Instagram account.",
    "accounts.tokenValid": "Token valid",
    "accounts.tokenExpiring": "Token expiring soon",
    "accounts.tokenExpired": "Token expired",
    "accounts.active": "Active",
    "accounts.inactive": "Inactive",
    "accounts.postsToday": "Posts today",
    "accounts.scheduledCount": "Scheduled",
    "accounts.removeConfirm": "Remove this account? All scheduled posts will be cancelled.",
    "accounts.postingConfig": "Posting Configuration",
    "accounts.maxPostsPerDay": "Max posts per day",
    "accounts.postingWindows": "Posting windows",
    "accounts.timezone": "Timezone",
    "accounts.minGap": "Minimum gap between posts (minutes)",

    "posts.title": "Posts",
    "posts.createPost": "Create Post",
    "posts.caption": "Caption",
    "posts.hashtags": "Hashtags",
    "posts.mediaType": "Media Type",
    "posts.image": "Image",
    "posts.carousel": "Carousel",
    "posts.reel": "Reel",
    "posts.scheduleDate": "Schedule Date",
    "posts.scheduleTime": "Schedule Time",
    "posts.account": "Account",
    "posts.selectAccount": "Select an account",
    "posts.draft": "Draft",
    "posts.scheduled": "Scheduled",
    "posts.publishing": "Publishing",
    "posts.published": "Published",
    "posts.failed": "Failed",
    "posts.retryPost": "Retry Post",
    "posts.deleteConfirm": "Delete this post?",
    "posts.captionPlaceholder": "Write your caption...",
    "posts.hashtagsPlaceholder": "#hashtag1 #hashtag2",

    "media.upload": "Upload Media",
    "media.dragDrop": "Drag and drop files here",
    "media.orBrowse": "or click to browse",
    "media.googleDrive": "Google Drive",
    "media.googleDriveUrl": "Paste Google Drive sharing link",
    "media.fetchFromUrl": "Fetch from URL",
    "media.maxImageSize": "Max image size: 8MB",
    "media.maxVideoSize": "Max video size: 100MB",
    "media.supportedFormats": "Supported: JPG, PNG, WebP, MP4, MOV",

    "import.title": "Import Posts",
    "import.uploadCsv": "Upload CSV or Excel file",
    "import.downloadTemplate": "Download Template",
    "import.step1Upload": "Upload File & Media",
    "import.step2Validate": "Validate",
    "import.step3Preview": "Preview",
    "import.step4Confirm": "Confirm & Schedule",
    "import.validationErrors": "Validation Errors",
    "import.validRows": "Valid rows",
    "import.invalidRows": "Invalid rows",
    "import.confirmImport": "Confirm Import",

    "templates.title": "Templates",
    "templates.createTemplate": "Create Template",
    "templates.name": "Template Name",
    "templates.captionTemplate": "Caption Template",
    "templates.defaultHashtags": "Default Hashtags",
    "templates.noTemplates": "No templates yet. Create your first template.",

    "language.switch": "Language",
    "language.en": "English",
    "language.es": "Spanish",
  },

  es: {
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.delete": "Eliminar",
    "common.edit": "Editar",
    "common.add": "Agregar",
    "common.search": "Buscar",
    "common.loading": "Cargando...",
    "common.error": "Error",
    "common.success": "Exito",
    "common.confirm": "Confirmar",
    "common.back": "Atras",
    "common.next": "Siguiente",
    "common.retry": "Reintentar",
    "common.upload": "Subir",
    "common.download": "Descargar",
    "common.actions": "Acciones",
    "common.status": "Estado",
    "common.noResults": "No se encontraron resultados",

    "auth.login": "Iniciar sesion",
    "auth.password": "Contrasena",
    "auth.loginTitle": "Instagram Scheduler",
    "auth.loginDescription": "Ingresa tu contrasena para continuar",
    "auth.invalidPassword": "Contrasena invalida",
    "auth.logout": "Cerrar sesion",

    "nav.dashboard": "Panel",
    "nav.accounts": "Cuentas",
    "nav.posts": "Publicaciones",
    "nav.newPost": "Nueva Publicacion",
    "nav.import": "Importar",
    "nav.templates": "Plantillas",
    "nav.settings": "Configuracion",

    "dashboard.title": "Panel de Control",
    "dashboard.scheduledToday": "Programadas Hoy",
    "dashboard.publishedToday": "Publicadas Hoy",
    "dashboard.pending": "Pendientes",
    "dashboard.failed": "Fallidas",
    "dashboard.recentPosts": "Publicaciones Recientes",
    "dashboard.accountHealth": "Estado de Cuentas",
    "dashboard.noPostsToday": "No hay publicaciones programadas para hoy",

    "accounts.title": "Cuentas",
    "accounts.addAccount": "Agregar Cuenta",
    "accounts.connectInstagram": "Conectar Cuenta de Instagram",
    "accounts.noAccounts": "No hay cuentas conectadas. Agrega tu primera cuenta de Instagram.",
    "accounts.tokenValid": "Token valido",
    "accounts.tokenExpiring": "Token por expirar",
    "accounts.tokenExpired": "Token expirado",
    "accounts.active": "Activa",
    "accounts.inactive": "Inactiva",
    "accounts.postsToday": "Publicaciones hoy",
    "accounts.scheduledCount": "Programadas",
    "accounts.removeConfirm": "Eliminar esta cuenta? Se cancelaran todas las publicaciones programadas.",
    "accounts.postingConfig": "Configuracion de Publicacion",
    "accounts.maxPostsPerDay": "Max publicaciones por dia",
    "accounts.postingWindows": "Ventanas de publicacion",
    "accounts.timezone": "Zona horaria",
    "accounts.minGap": "Intervalo minimo entre publicaciones (minutos)",

    "posts.title": "Publicaciones",
    "posts.createPost": "Crear Publicacion",
    "posts.caption": "Descripcion",
    "posts.hashtags": "Hashtags",
    "posts.mediaType": "Tipo de Medio",
    "posts.image": "Imagen",
    "posts.carousel": "Carrusel",
    "posts.reel": "Reel",
    "posts.scheduleDate": "Fecha Programada",
    "posts.scheduleTime": "Hora Programada",
    "posts.account": "Cuenta",
    "posts.selectAccount": "Selecciona una cuenta",
    "posts.draft": "Borrador",
    "posts.scheduled": "Programada",
    "posts.publishing": "Publicando",
    "posts.published": "Publicada",
    "posts.failed": "Fallida",
    "posts.retryPost": "Reintentar Publicacion",
    "posts.deleteConfirm": "Eliminar esta publicacion?",
    "posts.captionPlaceholder": "Escribe tu descripcion...",
    "posts.hashtagsPlaceholder": "#hashtag1 #hashtag2",

    "media.upload": "Subir Medio",
    "media.dragDrop": "Arrastra y suelta archivos aqui",
    "media.orBrowse": "o haz clic para buscar",
    "media.googleDrive": "Google Drive",
    "media.googleDriveUrl": "Pega el enlace compartido de Google Drive",
    "media.fetchFromUrl": "Obtener desde URL",
    "media.maxImageSize": "Tamano maximo de imagen: 8MB",
    "media.maxVideoSize": "Tamano maximo de video: 100MB",
    "media.supportedFormats": "Formatos: JPG, PNG, WebP, MP4, MOV",

    "import.title": "Importar Publicaciones",
    "import.uploadCsv": "Subir archivo CSV o Excel",
    "import.downloadTemplate": "Descargar Plantilla",
    "import.step1Upload": "Subir Archivo y Medios",
    "import.step2Validate": "Validar",
    "import.step3Preview": "Vista Previa",
    "import.step4Confirm": "Confirmar y Programar",
    "import.validationErrors": "Errores de Validacion",
    "import.validRows": "Filas validas",
    "import.invalidRows": "Filas invalidas",
    "import.confirmImport": "Confirmar Importacion",

    "templates.title": "Plantillas",
    "templates.createTemplate": "Crear Plantilla",
    "templates.name": "Nombre de Plantilla",
    "templates.captionTemplate": "Plantilla de Descripcion",
    "templates.defaultHashtags": "Hashtags Predeterminados",
    "templates.noTemplates": "No hay plantillas. Crea tu primera plantilla.",

    "language.switch": "Idioma",
    "language.en": "Ingles",
    "language.es": "Espanol",
  },
};

export function t(key: keyof TranslationKeys, locale: Locale = DEFAULT_LOCALE): string {
  return translations[locale]?.[key] ?? translations.en[key] ?? key;
}

export function getTranslations(locale: Locale): TranslationKeys {
  return translations[locale] ?? translations.en;
}
