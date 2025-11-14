import './bootstrap';
import Echo from 'laravel-echo';
import io from 'socket.io-client';

window.io = io;

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: 'notification-key',
    wsHost: 'localhost',
    wsPort: 8080,
    wssPort: 8080,
    forceTLS: false,
    disableStats: true,
    auth: {
        headers: {
            Authorization: 'Bearer ' + yourAuthToken,
        },
    },
});

Echo.private(`user.${userId}`)
    .notification((notification) => {
        console.log('Real-time notification:', notification);
        // Show toast, update UI, etc.
        showNotification(notification);
    });