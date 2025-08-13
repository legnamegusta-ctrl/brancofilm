// js/storageService.js
import { getStorage, ref, listAll, getMetadata, uploadBytesResumable, deleteObject, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { auth } from './firebase-config.js';

const storage = getStorage();

export async function listOrderPhotos(orderId) {
  const folderRef = ref(storage, `orders/${orderId}/photos`);
  const res = await listAll(folderRef);
  const photos = [];
  for (const item of res.items) {
    const meta = await getMetadata(item);
    const url = await getDownloadURL(item);
    photos.push({
      path: item.fullPath,
      name: meta.customMetadata?.originalName || item.name,
      size: meta.size,
      contentType: meta.contentType,
      uploadedAt: meta.customMetadata?.uploadedAt,
      uploadedBy: meta.customMetadata?.uploadedBy,
      url
    });
  }
  return photos;
}

export async function uploadOrderPhotos(orderId, files, opts = {}) {
  const { onProgress } = opts;
  const arr = Array.from(files);
  for (const file of arr) {
    const toUpload = await maybeCompress(file);
    const ext = file.name.split('.').pop();
    const path = `orders/${orderId}/photos/${crypto.randomUUID()}.${ext}`;
    const fileRef = ref(storage, path);
    await new Promise((resolve, reject) => {
      const task = uploadBytesResumable(fileRef, toUpload, {
        contentType: toUpload.type,
        customMetadata: {
          uploadedBy: auth.currentUser?.uid || 'anon',
          originalName: file.name,
          uploadedAt: new Date().toISOString()
        }
      });
      task.on('state_changed', snap => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        if (onProgress) onProgress(file, pct);
      }, reject, () => resolve());
    });
  }
}

export function deleteOrderPhoto(path) {
  const refObj = ref(storage, path);
  return deleteObject(refObj);
}

export function getDownloadURLFromPath(path) {
  return getDownloadURL(ref(storage, path));
}

async function maybeCompress(file) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const max = Math.max(img.width, img.height);
      if (max <= 2000) {
        resolve(file);
        return;
      }
      const scale = 2000 / max;
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        resolve(new File([blob], file.name, { type: file.type }));
      }, file.type, 0.9);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}
