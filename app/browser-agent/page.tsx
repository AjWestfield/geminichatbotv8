import { Metadata } from 'next';
import BrowserAgentChat from '@/components/browser-agent-chat';

export const metadata: Metadata = {
  title: 'Browser Agent - AI Web Research Assistant',
  description: 'Interact with an AI browser agent that can research, compare products, extract data, and perform complex web browsing tasks in real-time.',
  keywords: ['AI', 'browser automation', 'web research', 'data extraction', 'browser agent'],
};

export default function BrowserAgentPage() {
  return (
    <div className="h-screen overflow-hidden">
      <BrowserAgentChat />
    </div>
  );
}
