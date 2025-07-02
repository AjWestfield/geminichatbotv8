// Extended StoredImage type to support the new is_original_for_edit field
import { StoredImage as BaseStoredImage } from '@/lib/database/supabase'

export interface StoredImageWithOriginalFlag extends BaseStoredImage {
  is_original_for_edit?: boolean
}
