NMWS Firebase/Firestore setup

1. firebase-config.js is already configured for project nmws-website.
2. Firestore database must exist.
3. Firestore rules for initial testing:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if true; }
  }
}

4. This version uses Cloudinary for album, slider, member and developer image/video uploads because Firebase Storage is not enabled on the Spark plan. Firestore stores the content and the Cloudinary HTTPS URL. New uploaded media is therefore shared across computers and phones.
5. Text/data (programs, notices, members, contacts, developer details, messages, slider/album metadata) is synchronized through Firestore.
6. After testing locally, upload this folder to GitHub/Netlify.


CLOUDINARY MEDIA
-----------------
Cloud Name: rcaihswf
Unsigned Upload Preset: nmws_upload
The website uploads media to Cloudinary using the unsigned preset. Do not put an API Secret in the website.

IMPORTANT: Existing old records whose src/photo/image value starts with "idb:" are legacy browser-local uploads. They will still work only on the browser that originally uploaded them. Re-upload those old photos through the admin pages to move them to Cloudinary and make them shared across devices.
