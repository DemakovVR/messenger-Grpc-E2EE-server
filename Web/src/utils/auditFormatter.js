const actionTitles = {
    // AuthService
    '/auth.AuthService/Register': 'Регистрация пользователя',
    '/auth.AuthService/Login': 'Вход в систему',
    '/auth.AuthService/RefreshToken': 'Обновление access-токена',
    '/auth.AuthService/Logout': 'Выход из системы',
    '/auth.AuthService/ChangePassword': 'Смена пароля',

    // UserService
    '/auth.UserService/GetProfile': 'Запрос профиля',
    '/auth.UserService/UpdateProfile': 'Обновление профиля',
    '/auth.UserService/GetPublicKey': 'Получение публичного ключа',
    '/auth.UserService/UpdatePublicKey': 'Обновление публичного ключа',
    '/auth.UserService/GetPublicProfile': 'Просмотр публичного профиля',
    '/auth.UserService/DeleteAccount': 'Удаление аккаунта',

    // ContactService
    '/contact.ContactService/SearchUsers': 'Поиск пользователей',
    '/contact.ContactService/AddContact': 'Добавление контакта',
    '/contact.ContactService/GetContacts': 'Загрузка списка контактов',
    '/contact.ContactService/DeleteContact': 'Удаление контакта',
    '/contact.ContactService/BlockContact': 'Блокировка пользователя',
    '/contact.ContactService/GetBlockedUsers': 'Запрос списка заблокированных',
    '/contact.ContactService/UnblockContact': 'Разблокировка пользователя',

    // ChatService
    '/chat.ChatService/CreatePrivateChat': 'Создание личного чата',
    '/chat.ChatService/CreateGroupChat': 'Создание группового чата',
    '/chat.ChatService/GetChats': 'Загрузка списка чатов',
    '/chat.ChatService/GetChat': 'Открытие чата',
    '/chat.ChatService/DeleteChat': 'Удаление чата',
    '/chat.ChatService/AddParticipants': 'Добавление участников в группу',
    '/chat.ChatService/RemoveParticipants': 'Удаление участников из группы',
    '/chat.ChatService/LeaveGroup': 'Выход из группы',

    // MessageService
    '/message.MessageService/SendMessage': 'Отправка сообщения',
    '/message.MessageService/SendReply': 'Ответ на сообщение',
    '/message.MessageService/GetMessages': 'Просмотр истории сообщений',
    '/message.MessageService/ConnectMessages': 'Подключение к стриму сообщений',
    '/message.MessageService/DeleteMessage': 'Удаление сообщения',
    '/message.MessageService/EditMessage': 'Редактирование сообщения',

    // FileService
    '/file.FileService/UploadFile': 'Загрузка файла',
    '/file.FileService/DownloadFile': 'Скачивание файла',

    // KeyService
    '/keys.KeyService/UploadKeys': 'Синхронизация ключей шифрования',
    '/keys.KeyService/GetPreKeyBundle': 'Запрос предключей',
    '/keys.KeyService/UploadOneTimeKeys': 'Загрузка одноразовых ключей',
    '/keys.KeyService/RotateSignedPreKey': 'Ротация подписанного предключа',

    // AuditService
    '/audit.AuditService/GetUserLogs': 'Просмотр журнала безопасности',
    '/audit.AuditService/GetChatLogs': 'Запрос истории логов чата',
};

function getStatusInfo(status) {
    if (status === 'OK') {
        return { 
            text: 'Успешно', 
            bgClass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
        };
    }
    return { 
        text: `Ошибка (${status})`, 
        bgClass: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' 
    };
}

export function translateAuditLog(log) {
    const humanReadableAction = actionTitles[log.action] || log.action;
    
    let duration = '';
    let statusInfo = getStatusInfo('OK');
    let clientIP = 'Неизвестно';
    let errorDetails = '';

    try {
        if (log.details && log.details.startsWith('{')) {
            const parsedDetails = JSON.parse(log.details);
            duration = parsedDetails.duration || '';
            statusInfo = getStatusInfo(parsedDetails.status);
            clientIP = parsedDetails.client_ip || 'Неизвестно';
            errorDetails = parsedDetails.error || '';
        } else {
            duration = log.details || '';
        }
    } catch (e) {
        duration = log.details || '';
    }

    const formattedTime = log.createdAt 
        ? new Date(log.createdAt).toLocaleString('ru-RU') 
        : '—';

    return {
        id: log.id,
        time: formattedTime,
        action: humanReadableAction,
        status: statusInfo.text,
        statusBg: statusInfo.bgClass,
        ip: clientIP,
        duration: duration,
        error: errorDetails
    };
}