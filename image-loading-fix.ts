// hooks/use-chat-persistence-optimized.ts
// Add this to your existing file or replace the image loading section

export async function loadChatImages(chatId: string, limit = 50) {
  try {
    const { data: images, error } = await supabase
      .from('images')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(limit); // Only load 50 images initially
    
    if (error) throw error;
    return images || [];
  } catch (error) {
    console.error('Error loading images:', error);
    return [];
  }
}

// Add a "Load More Images" button functionality
export async function loadMoreImages(chatId: string, offset: number) {
  const { data: images } = await supabase
    .from('images')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .range(offset, offset + 49);
  
  return images || [];
}
