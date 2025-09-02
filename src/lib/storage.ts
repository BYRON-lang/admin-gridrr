import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

// Storage configuration
export const storageConfig = {
  bucket: process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'Gridrr',
  region: process.env.NEXT_PUBLIC_SUPABASE_STORAGE_REGION || 'ap-southeast-1',
  endpoint: process.env.NEXT_PUBLIC_SUPABASE_STORAGE_ENDPOINT || '',
  key: process.env.NEXT_PUBLIC_SUPABASE_STORAGE_KEY || '',
  secret: process.env.NEXT_PUBLIC_SUPABASE_STORAGE_SECRET || ''
};

// Initialize storage bucket
const initializeStorage = async () => {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error listing buckets:', error);
      return;
    }

    const bucketExists = buckets.some(bucket => bucket.name === storageConfig.bucket);
    
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(storageConfig.bucket, {
        public: false,
        allowedMimeTypes: ['image/*', 'video/*', 'application/pdf'],
        fileSizeLimit: 1024 * 1024 * 50, // 50MB
      });

      if (createError) {
        console.error('Error creating bucket:', createError);
        return;
      }
      console.log(`Bucket '${storageConfig.bucket}' created successfully`);
    }

    // Set bucket policies
    const { error: policyError } = await supabase
      .from('storage.buckets')
      .update({
        public: false,
        file_size_limit: 1024 * 1024 * 50, // 50MB
        allowed_mime_types: ['image/*', 'video/*', 'application/pdf']
      })
      .eq('name', storageConfig.bucket);

    if (policyError) {
      console.error('Error setting bucket policies:', policyError);
    }

  } catch (error) {
    console.error('Error initializing storage:', error);
  }
};

// Initialize storage when this module is imported
if (typeof window !== 'undefined') {
  initializeStorage();
}

export default storageConfig;
