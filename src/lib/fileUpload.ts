import { storageConfig, supabase } from './storage';

export const uploadFile = async (file: File, path: string) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
    const filePath = `${path}/${fileName}`.replace(/\/\//g, '/');
    
    console.log('Uploading file:', {
      bucket: storageConfig.bucket,
      filePath,
      size: file.size,
      type: file.type
    });

    // 1. Upload the file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(storageConfig.bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // 2. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(storageConfig.bucket)
      .getPublicUrl(filePath);

    console.log('File uploaded successfully:', {
      path: filePath,
      publicUrl,
      fullPath: uploadData?.path
    });

    return {
      success: true,
      path: filePath,
      url: publicUrl,
      fileName,
      fullPath: uploadData?.path
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const deleteFile = async (filePath: string) => {
  try {
    const { error } = await supabase.storage
      .from(storageConfig.bucket)
      .remove([filePath]);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
