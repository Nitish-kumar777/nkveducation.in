// app/api/images/route.js
import { NextResponse } from 'next/server';
import cloudinary from 'cloudinary';
import Image from '@/models/Image';
import dbConnect from '@/lib/dbConnect'

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  await dbConnect();

  try {
    const formData = await request.formData();
    const title = formData.get('title');
    const description = formData.get('description');
    const file = formData.get('image');

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No image file provided' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    const bytes = Buffer.from(buffer);

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.v2.uploader
        .upload_stream(
          {
            folder: 'page-img',
            resource_type: 'auto'
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(bytes);
    });

    // Save to MongoDB
    const newImage = new Image({
      title,
      description,
      imageUrl: result.secure_url,
      publicId: result.public_id
    });

    await newImage.save();

    return NextResponse.json(
      { success: true, data: newImage },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: 'Error uploading image', error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  await dbConnect();

  try {
    const images = await Image.find().sort({ createdAt: -1 });
    return NextResponse.json(
      { success: true, data: images },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Error fetching images', error: error.message },
      { status: 500 }
    );
  }
}