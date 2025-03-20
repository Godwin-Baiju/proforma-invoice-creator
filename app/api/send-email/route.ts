import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { clientDetails, items, rateOnlyMode, calculateTotal, pdfBuffer } = await request.json();

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('Email credentials not configured');
      return NextResponse.json(
        { success: false, error: 'Email service not configured' },
        { status: 500 }
      );
    }

    // Create email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Format items for email
    const itemsList = items.map((item: any) => `
      ${item.name}
      ${item.productSize ? `Size: ${item.productSize}` : ''}
      ${item.area ? `Area: ${item.area} sq ft` : ''}
      ${item.rate ? `Rate: ₹${item.rate}/sq ft` : ''}
      ${item.amount ? `Amount: ₹${item.amount}` : ''}
      ${item.remarks ? `Remarks: ${item.remarks}` : ''}
      ----------------------------------------
    `).join('\n');

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://proforma-invoice-creator.vercel.app/Logo_With_Name.png" alt="Our Own Marble House Logo" style="max-width: 150px; height: auto;" />
        </div>
        <p>Dear ${clientDetails.name},<br>
        <br>Thank you for your interest in Our Own Marble House. Please find the attached proforma invoice for your reference.<br>
        <br>If you have any questions or need further assistance, please don't hesitate to contact us.<br>
        <br>Best regards,<br>Our Own Marble House<br>Thrissur Road, Irinjalakuda, Thrissur, Kerala 680121<br>Phone: +91 70349 03099<br>Email: ourownmarbles@gmail.com</p>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: clientDetails.email,
      subject: `Proforma Invoice from Our Own Marble House - ${clientDetails.name}`,
      text: emailContent,
      html: emailContent.replace(/\n/g, '<br>'),
      attachments: [
        {
          filename: `Proforma Invoice for ${clientDetails.name}.pdf`,
          content: Buffer.from(pdfBuffer, 'base64'),
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Email sending error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to send email. Please try again.';
    
    if (error.code === 'EAUTH') {
      errorMessage = 'Invalid email credentials. Please check the configuration.';
    } else if (error.code === 'ESOCKET') {
      errorMessage = 'Connection error. Please check your internet connection.';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused. Please try again later.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timed out. Please try again.';
    } else if (error.code === 'EADDRINUSE') {
      errorMessage = 'Port is already in use. Please try again later.';
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
} 
