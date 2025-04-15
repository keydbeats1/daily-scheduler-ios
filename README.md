# Daily Task Scheduler - Web App Alternative

## Important Limitations

This is a web-based alternative to the requested native iOS app. Due to technological constraints, we cannot build a native iOS app with Swift/SwiftUI. Instead, this is a Progressive Web App (PWA) that provides similar functionality with some limitations:

### Key Limitations

1. **Notifications**: iOS has limited support for web notifications. Background notifications don't work as reliably as in native apps.
2. **Offline Storage**: While this app uses IndexedDB for offline storage, it has storage limits compared to native solutions like Core Data.
3. **Background Processing**: The app cannot run continuous background processes like a native app.
4. **Installation Experience**: The "Add to Home Screen" experience is not as seamless as downloading from the App Store.
5. **Native Features**: Access to certain device features is limited compared to native apps.

### How to Use

1. Open the app in Safari on your iOS device
2. Add to Home Screen (tap share icon then "Add to Home Screen")
3. Launch from your home screen for the fullscreen experience
4. The app will work offline once installed

### Features Included

- Task management with times and categories
- Basic notifications (with limitations)
- Focus mode (web implementation)
- Task completion tracking
- Motivational quotes
- Calendar view for managing upcoming days

For the best experience, consider checking the app regularly rather than relying solely on notifications.
