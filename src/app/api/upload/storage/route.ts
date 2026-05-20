import { NextRequest } from 'next/server';
import {
  handleStorageUploadDelete,
  handleStorageUploadPost,
} from '@/lib/storageUploadRoute';

export async function POST(request: NextRequest) {
  return handleStorageUploadPost(request);
}

export async function DELETE(request: NextRequest) {
  return handleStorageUploadDelete(request);
}
