export const fileToBase64NoPrefix = async (file: File) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // reader.result is "data:<mime>;base64,XXXX..."
      const result = (reader.result as string).split(',')[1];
      resolve(result);
    };
    reader.onerror = error => reject(error);
  });
}
