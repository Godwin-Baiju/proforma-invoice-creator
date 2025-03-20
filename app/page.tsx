"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Download, Trash2, LogOut, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import React, { useRef, useMemo, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2 } from "lucide-react"
import { format } from "date-fns"
import { toast, Toaster } from "sonner"
import { createPortal } from 'react-dom'
import html2canvas from 'html2canvas'

interface InvoiceItem {
  id: string
  itemName: string
  size: string
  sqft: string
  rate: string
  remarks: string
  finish?: string
    total?: string
}

interface PDFTemplateProps {
  items: InvoiceItem[]
  clientDetails: { name: string; phone: string; email: string }
  calculateTotal: () => number
  rateOnlyMode: boolean
}

const PDFTemplate = React.forwardRef<HTMLDivElement, PDFTemplateProps>((props, ref) => {
  const { items, clientDetails, calculateTotal, rateOnlyMode } = props;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formattedDate = format(new Date(), "EEEE, MMMM d, yyyy");
  const invoiceNumber = `INV-${format(new Date(), "yyyy-MMdd")}`;
  const validUntil = format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "MMMM d, yyyy");

  const pdfStyles = `
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap');
        
        /* A4 size settings */
        @page {
            size: A4;
            margin: 0;
        }
        
        :root {
            --primary: #1a2639;
            --secondary: #3e4a61;
            --accent: #3d97c9; /* Changed to match logo blue */
            --accent-light: #c2d7e9;
            --light: #f8f9fa;
            --dark: #212529;
            --white: #ffffff;
            --gray-100: #f8f9fa;
            --gray-200: #e9ecef;
            --gray-300: #dee2e6;
            --gray-400: #ced4da;
            --gray-500: #adb5bd;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Montserrat', sans-serif;
            line-height: 1.5;
            color: var(--dark);
            background-color: white;
            margin: 0;
            padding: 0;
        }
        
        .page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 15mm;
            position: relative;
            background-color: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        
        @media print {
            body {
                background-color: white;
                margin: 0;
                padding: 0;
            }
            
            .page {
                width: 210mm;
                min-height: 297mm;
                margin: 0;
                padding: 15mm;
                page-break-after: always;
                box-shadow: none;
            }
            
            .page:last-child {
                page-break-after: auto;
            }
        }
        
        h1, h2, h3 {
            font-family: 'Playfair Display', serif;
            font-weight: 700;
            color: var(--primary);
        }
        
        h1 {
            font-size: 22pt;
            margin-bottom: 10px;
        }
        
        h2 {
            font-size: 14pt;
            margin: 12px 0 8px;
            position: relative;
            padding-bottom: 6px;
        }
        
        h2::after {
            content: "";
            position: absolute;
            bottom: 0;
            left: 0;
            width: 50px;
            height: 2px;
            background: var(--accent);
        }
        
        h3 {
            font-size: 12pt;
            margin: 10px 0 6px;
        }
        
        p {
            margin-bottom: 6px;
            font-size: 9pt;
            color: var(--secondary);
        }
        
        .document-title {
            text-align: center;
            font-size: 24pt;
            font-weight: 700;
            color: var(--primary);
            margin-bottom: 5mm;
            font-family: 'Playfair Display', serif;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1mm;
            padding-bottom: 1mm;
            border-bottom: 1px solid var(--gray-300);
        }
        
        .company-info {
            width: 70%;
        }
        
        .company-name {
            font-size: 16pt;
            font-weight: 700;
            color: var(--primary);
            margin-bottom: 2mm;
            font-family: 'Playfair Display', serif;
        }
        
        .company-details {
            font-size: 8pt;
            color: var(--secondary);
        }
        
        .logo-container {
            width: 30%;
            text-align: right;
            display: flex;
            justify-content: flex-end;
            align-items: center;
        }
        
        .logo {
            max-width: 180px;
            height: auto;
        }
        
        .tagline {
            font-style: italic;
            color: var(--accent);
            margin-bottom: 3mm;
            font-size: 10pt;
        }
        
        .section {
            margin-bottom: 8mm;
        }
        
        .section-title {
            font-weight: 600;
            color: var(--primary);
            margin-bottom: 2mm;
            font-size: 11pt;
        }
        
        ul, ol {
            margin-left: 5mm;
            margin-bottom: 6px;
            padding-left: 10px;
        }
        
        li {
            margin-bottom: 1.5mm;
            font-size: 9pt;
            color: var(--secondary);
        }
        
        .feature-list {
            list-style: none;
            padding-left: 5mm;
        }
        
        .feature-list li {
            position: relative;
            padding-left: 4mm;
        }
        
        .feature-list li::before {
            content: "✓";
            position: absolute;
            left: 0;
            color: var(--accent);
            font-weight: bold;
        }
        
        .product-card {
            display: flex;
            margin-bottom: 6mm;
            border: 1px solid var(--gray-300);
            border-radius: 2mm;
            overflow: hidden;
        }
        
        .product-image {
            width: 25%;
            background-color: var(--gray-200);
            min-height: 20mm;
        }
        
        .product-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .product-info {
            width: 75%;
            padding: 2mm;
        }
        
        .product-info h3 {
            margin-top: 0;
            font-size: 11pt;
        }
        
        .image-gallery {
            display: flex;
            gap: 2mm;
            margin: 4mm 0;
        }
        
        .gallery-item {
            flex: 1;
            border-radius: 2mm;
            overflow: hidden;
            height: 30mm;
            background-color: var(--gray-200);
        }
        
        .gallery-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .invoice-details {
            margin-bottom: 6mm;
            padding: 3mm;
            background-color: var(--gray-100);
            border-radius: 2mm;
        }
        
        .invoice-number {
            font-weight: 600;
            color: var(--primary);
            margin-bottom: 1mm;
            font-size: 10pt;
        }
        
        .date {
            color: var(--secondary);
            font-size: 9pt;
            margin-bottom: 1mm;
        }
        
        .client-info {
            margin-bottom: 6mm;
        }
        
        .info-row {
            display: flex;
            margin-bottom: 1.5mm;
        }
        
        .info-label {
            width: 25mm;
            font-weight: 600;
            color: var(--primary);
            font-size: 9pt;
        }
        
        .info-value {
            flex: 1;
            color: var(--secondary);
            font-size: 9pt;
        }
        
        .quote-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6mm;
            font-size: 8pt;
        }
        
        .quote-table th {
            background-color: var(--primary);
            color: white;
            padding: 1.5mm;
            text-align: left;
            font-weight: 600;
        }
        
        .quote-table th:first-child {
            border-top-left-radius: 1.5mm;
        }
        
        .quote-table th:last-child {
            border-top-right-radius: 1.5mm;
        }
        
        .quote-table td {
            padding: 1.5mm;
            border-bottom: 1px solid var(--gray-300);
            color: var(--secondary);
        }
        
        .quote-table tr:last-child td {
            border-bottom: none;
        }
        
        .quote-table tr:nth-child(even) {
            background-color: var(--gray-100);
        }
        
        .totals {
            margin: 4mm 0 6mm;
            padding: 3mm;
            background-color: var(--gray-100);
            border-radius: 2mm;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 1mm 0;
            font-weight: 600;
            font-size: 9pt;
        }
        
        .total-row-name {
            color: var(--primary);
        }
        
        .conditions {
            margin-top: 6mm;
            padding: 3mm;
            background-color: var(--gray-100);
            border-radius: 2mm;
        }
        
        .conditions-title {
            display: block;
            margin-bottom: 1.5mm;
            color: var(--primary);
            font-weight: 600;
            font-size: 10pt;
        }
        
        .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 10mm;
            padding-top: 3mm;
        }
        
        .signature-box {
            width: 45%;
        }
        
        .signature-line {
            margin-top: 12mm;
            border-top: 1px solid var(--gray-400);
            padding-top: 1.5mm;
            font-size: 8pt;
            color: var(--secondary);
            text-align: center;
        }
        
        .clearfix::after {
            content: "";
            clear: both;
            display: table;
        }
        
        .two-column {
            display: flex;
            gap: 4mm;
        }
        
        .column {
            flex: 1;
        }
        
        /* Brand logos section */
        .brand-logos {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 3mm;
            margin: 6mm 0;
            padding: 4mm;
            background-color: var(--gray-100);
            border-radius: 2mm;
        }
        
        .brand-logo {
            width: calc(20% - 3mm);
            height: 15mm;
            background-color: white;
            border: 1px solid var(--gray-300);
            border-radius: 1mm;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2mm;
        }
        
        .brand-logo img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
            `;

  if (!mounted) {
    return null;
  }

  return (
    <div className="pdf-container">
      <style>{pdfStyles}</style>
      <div ref={ref}>
      {/* Page 1: Company Profile */}
    <div className="page">
        <div className="header">
            <div className="company-info">
                <div className="company-details">
                    Headquarters: Irinjalakuda, Thrissur, Kerala<br />
                    Showroom: Potta, Chalakudy, Kerala<br />
                    Phone: +91 98765 43210 | Email: info@ownmarblehouse.com
                </div>
            </div>
            <div className="logo-container">
                <img src="Logo_With_Name.png" alt="Our Own Marble House Logo" className="logo" />
            </div>
        </div>
        
        <div className="section">
            <h2>Overview</h2>
            <p>Since 1989, Our Own Marble House has been a trusted name in the building materials industry, specializing in premium tiles, marbles, granites, and sanitaryware. With decades of expertise, we transform ordinary spaces into breathtaking masterpieces through quality craftsmanship and innovative design solutions.</p>
            
            <div className="image-gallery">
                <div className="gallery-item">
                    <img src="MARBLE.jpg?height=120&width=150" alt="Elegant marble flooring" />
                </div>
                <div className="gallery-item">
                    <img src="TILE.jpg?height=120&width=150" alt="Custom tile work" />
                </div>
            </div>
        </div>
        
        <div className="section">
            <h2>Our Story</h2>
            <p>Originating as a family-owned enterprise in Kerala, our company has built a legacy founded on trust, commitment, and excellence. With our headquarters in Irinjalakuda, Thrissur, and our showroom located in Potta, Chalakudy, we proudly serve the region with over three decades of experience.</p>
            <p>Our journey began with a simple vision: to provide the highest quality materials with exceptional service. Today, we've grown to become one of the region's most respected suppliers of premium building materials.</p>
        </div>
        
        <div className="section">
            <h2>Products & Services</h2>
            
            <div className="two-column">
                <div className="column">
                    <h3>Tiles, Marbles & Granites</h3>
                    <p>A wide selection of exquisite materials suited for diverse design requirements. Our collection includes imported Italian marbles, premium granites, and designer tiles.</p>
                    
                    <h3>Sanitaryware</h3>
                    <p>Combining style and functionality to enhance bathrooms and utility spaces. We offer a comprehensive range of high-quality fixtures and fittings from leading brands.</p>
                </div>
                
                <div className="column">
                    <h3>Customized Solutions</h3>
                    <p>Tailored products and services designed to bring your unique vision to life. Our expert team works closely with you to create bespoke solutions.</p>
                    
                    <h3>Installation Services</h3>
                    <p>Professional installation services to ensure perfect execution of your design vision, with attention to detail and quality craftsmanship.</p>
                </div>
            </div>
        </div>
        
        <div className="section">
            <h2>Our Brands</h2>
            <p>We are proud to be authorized dealers for some of the world's finest brands in tiles, marbles, and sanitaryware:</p>
            
            <div className="brand-logos">
                <div className="brand-logo">
                    <img src="QUTONE.png?height=50&width=100" alt="Brand Logo 1" />
                </div>
                <div className="brand-logo">
                    <img src="KAJARIA.jpg?height=50&width=100" alt="Brand Logo 2" />
                </div>
                <div className="brand-logo">
                    <img src="RAK.png?height=50&width=100" alt="Brand Logo 3" />
                </div>
                <div className="brand-logo">
                    <img src="SIMPOLO.png?height=50&width=100" alt="Brand Logo 4" />
                </div>
                <div className="brand-logo">
                    <img src="SUNHEARRT.jpg?height=50&width=100" alt="Brand Logo 5" />
                </div>
            </div>
        </div>
    </div>
    
    {/* Page 2: Proforma Invoice Introduction */}
    <div className="page">
        <div className="header">
            <div className="company-info">
                <div className="company-details">
                    Headquarters: Irinjalakuda, Thrissur, Kerala<br />
                    Showroom: Potta, Chalakudy, Kerala<br />
                    Phone: +91 98765 43210 | Email: info@ownmarblehouse.com
                </div>
            </div>
            <div className="logo-container">
                <img src="Logo_With_Name.png" alt="Our Own Marble House Logo" className="logo" />
            </div>
        </div>
        
<div className="section">
            <h2>Why Choose Us?</h2>
            <ul className="feature-list">
                <li><strong>Proven Expertise:</strong> Over 35 years in the industry, ensuring meticulous attention to every detail.</li>
                <li><strong>Premium Quality:</strong> We source only the finest materials to guarantee durability and timeless beauty.</li>
                <li><strong>Customer-Centric Approach:</strong> Our personalized service is designed to exceed your expectations.</li>
                <li><strong>Competitive Pricing:</strong> We offer the best value without compromising on quality.</li>
            </ul>
        </div>
        <div className="section">
            <h2>Vision & Commitment</h2>
            <p>Our mission is to continue setting benchmarks in the building materials industry. Committed to innovation, quality, and exceptional service, we strive to help our customers create spaces that are both functional and aesthetically stunning.</p>
            <p>Discover how our premium flooring solutions can transform your project into a work of art.</p>
        </div>
        
        <div className="section">
            <h2>Our Process</h2>
            <ol>
                <li><strong>Consultation:</strong> We begin with a detailed consultation to understand your requirements, preferences, and budget.</li>
                <li><strong>Material Selection:</strong> Our experts help you select the perfect materials that align with your vision and practical needs.</li>
                <li><strong>Quotation:</strong> We provide a transparent and detailed quotation with no hidden costs.</li>
                <li><strong>Delivery:</strong> We ensure timely delivery of materials to your site, handled with utmost care.</li>
                <li><strong>Support:</strong> Our team remains available for guidance during installation and after-sales support.</li>
            </ol>
        </div>
        
        <div className="section">
            <h2>Contact Information</h2>
            <p><strong>Headquarters:</strong> Irinjalakuda, Thrissur, Kerala</p>
            <p><strong>Showroom:</strong> Potta, Chalakudy, Kerala</p>
            <p><strong>Phone:</strong> +91 98765 43210</p>
            <p><strong>Email:</strong> info@ownmarblehouse.com</p>
            <p><strong>Hours:</strong> Monday - Saturday: 9:00 AM - 7:00 PM</p>
        </div>
        
        <div className="document-title" style={{ marginTop: '15mm', marginBottom: '10mm' }}>Proforma Invoice</div>
        
        <div className="section">
            <p style={{ textAlign: 'center', fontSize: '10pt' }}>The following page contains a detailed proforma invoice for your selected products and services.</p>
            <p style={{ textAlign: 'center', fontSize: '10pt' }}>Please review all details carefully and contact us with any questions.</p>
        </div>
    </div>

    <div className="page">
        <div className="document-title">Proforma Invoice</div>
        
        <div className="header">
            <div className="company-info">
                <div className="company-details">
                    Headquarters: Irinjalakuda, Thrissur, Kerala<br />
                    Showroom: Potta, Chalakudy, Kerala<br />
                    Phone: +91 98765 43210 | Email: info@ownmarblehouse.com
                </div>
            </div>
            <div className="logo-container">
                <img src="Logo_With_Name.png" alt="Our Own Marble House Logo" className="logo" />
            </div>
        </div>
          
          <div className="invoice-details">
            <div className="invoice-number">Invoice #: {invoiceNumber}</div>
            <div className="date">Date: {formattedDate}</div>
            <div className="date">Valid Until: {validUntil}</div>
          </div>
          
          <div className="client-info">
            <div className="info-row">
              <span className="info-label">Client Name:</span>
              <span className="info-value">{clientDetails.name || "N/A"}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Contact Number:</span>
              <span className="info-value">{clientDetails.phone || "N/A"}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email Address:</span>
              <span className="info-value">{clientDetails.email || "N/A"}</span>
            </div>
          </div>
          
          <table className="quote-table">
            <thead>
              <tr>
                <th>SR.</th>
                <th>Item Name</th>
                <th>Size</th>
                {rateOnlyMode ? (
                  <>
                    <th>Finish</th>
                    <th>Rate</th>
                    <th>Remarks</th>
                  </>
                ) : (
                  <>
                    <th>Area (Sqft)</th>
                    <th>Rate</th>
                    <th>Total</th>
                    <th>Remarks</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.itemName}</td>
                  <td>{item.size}</td>
                  {rateOnlyMode ? (
                    <>
                      <td>{item.finish || "N/A"}</td>
                      <td>₹{item.rate}</td>
                      <td>{item.remarks || "N/A"}</td>
                    </>
                  ) : (
                    <>
                      <td>{item.sqft || "N/A"}</td>
                      <td>₹{item.rate}</td>
                      <td>₹{item.total || "0.00"}</td>
                      <td>{item.remarks || "N/A"}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          
          {!rateOnlyMode && (
            <div className="totals">
              <div className="total-row">
                <span className="total-row-name">Total Amount:</span>
                <span>₹{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          )}
          
          <div className="conditions">
            <span className="conditions-title">Terms and Conditions:</span>
            <ul>
              <li>This is a proforma invoice and not a tax invoice.</li>
              <li>Payment terms: 50% advance, remaining before delivery.</li>
              <li>Delivery within 2-3 weeks from confirmation and receipt of advance payment.</li>
              <li>Prices are valid for 30 days from the date of this proforma invoice.</li>
              <li>Installation charges are not included unless specifically mentioned.</li>
            </ul>
          </div>
          
          <div className="signature-section">
            <div className="signature-box">
              <div className="signature-line">Authorized Signature</div>
            </div>
            <div className="signature-box">
              <div className="signature-line">Client Signature</div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
});

PDFTemplate.displayName = 'PDFTemplate'

// Fixed credentials
const FIXED_USERNAME = "admin"
const FIXED_PASSWORD = "marble123"

const WhatsAppIcon = () => (
  <svg width="24" height="24" viewBox="0 0 30.667 30.667" fill="#FFFFFF" className="mr-2">
    <path
      d="M30.667,14.939c0,8.25-6.74,14.938-15.056,14.938c-2.639,0-5.118-0.675-7.276-1.857L0,30.667l2.717-8.017
      c-1.37-2.25-2.159-4.892-2.159-7.712C0.559,6.688,7.297,0,15.613,0C23.928,0.002,30.667,6.689,30.667,14.939z M15.61,2.382
      c-6.979,0-12.656,5.634-12.656,12.56c0,2.748,0.896,5.292,2.411,7.362l-1.58,4.663l4.862-1.545c2,1.312,4.393,2.076,6.963,2.076
      c6.979,0,12.658-5.633,12.658-12.559C28.27,8.016,22.59,2.382,15.61,2.382z M23.214,18.38c-0.094-0.151-0.34-0.243-0.708-0.427
      c-0.367-0.184-2.184-1.069-2.521-1.189c-0.34-0.123-0.586-0.185-0.832,0.182c-0.243,0.367-0.951,1.191-1.168,1.437
      c-0.215,0.245-0.43,0.276-0.799,0.095c-0.369-0.186-1.559-0.57-2.969-1.817c-1.097-0.972-1.838-2.169-2.052-2.536
      c-0.217-0.366-0.022-0.564,0.161-0.746c0.165-0.165,0.369-0.428,0.554-0.643c0.185-0.213,0.246-0.364,0.369-0.609
      c0.121-0.245,0.06-0.458-0.031-0.643c-0.092-0.184-0.829-1.984-1.138-2.717c-0.307-0.732-0.614-0.611-0.83-0.611
      c-0.215,0-0.461-0.03-0.707-0.03S9.897,8.215,9.56,8.582s-1.291,1.252-1.291,3.054c0,1.804,1.321,3.543,1.506,3.787
      c0.186,0.243,2.554,4.062,6.305,5.528c3.753,1.465,3.753,0.976,4.429,0.914c0.678-0.062,2.184-0.885,2.49-1.739
      C23.307,19.268,23.307,18.533,23.214,18.38z"
    />
  </svg>
)

const ItemForm = ({ currentItem, onInputChange, onSubmit }: {
  currentItem: InvoiceItem;
  onInputChange: (field: keyof InvoiceItem, value: string) => void;
  onSubmit: () => void;
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Input
        placeholder="Item name"
        value={currentItem.itemName}
        onChange={(e) => onInputChange('itemName', e.target.value)}
        className="border-gray-300 h-10"
      />
      <Input
        placeholder="Size"
        value={currentItem.size}
        onChange={(e) => onInputChange('size', e.target.value)}
        className="border-gray-300 h-10"
      />
      <Input
        placeholder="Area (Sqft)"
        value={currentItem.sqft}
        onChange={(e) => onInputChange('sqft', e.target.value)}
        className="border-gray-300 h-10"
      />
      <Input
        placeholder="Rate"
        value={currentItem.rate}
        onChange={(e) => onInputChange('rate', e.target.value)}
        className="border-gray-300 h-10"
      />
      <Input
        placeholder="Remarks"
        value={currentItem.remarks}
        onChange={(e) => onInputChange('remarks', e.target.value)}
        className="border-gray-300 h-10 min-h-[40px] resize-none"
      />
      <Button onClick={onSubmit} className="col-span-full">
        Add Item
      </Button>
    </div>
  );
};

const QuotationTable = ({ items, onRemoveItem }: {
  items: InvoiceItem[];
  onRemoveItem: (id: string) => void;
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left p-2">Item Name</th>
            <th className="text-left p-2">Size</th>
            <th className="text-left p-2">Area (Sqft)</th>
            <th className="text-left p-2">Rate</th>
            <th className="text-left p-2">Total</th>
            <th className="text-left p-2">Remarks</th>
            <th className="text-left p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="p-2">{item.itemName}</td>
              <td className="p-2">{item.size}</td>
              <td className="p-2">{item.sqft}</td>
              <td className="p-2">{item.rate}</td>
              <td className="p-2">{item.total}</td>
              <td className="p-2">{item.remarks}</td>
              <td className="p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveItem(item.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [clientDetails, setClientDetails] = useState({ name: "", phone: "", email: "" })
  const [emailAddress, setEmailAddress] = useState("")
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [currentItem, setCurrentItem] = useState<InvoiceItem>({
    id: "",
    itemName: "",
    size: "",
    sqft: "",
    rate: "",
    remarks: "",
    finish: "",
  })
  const [rateOnlyMode, setRateOnlyMode] = useState(false)
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const pdfRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const authStatus = localStorage.getItem("marbleHouseAuth")
    if (authStatus === "true") {
      setIsAuthenticated(true)
    }
  }, [])

  const pdfOptions = {
    margin: 1,
    filename: clientDetails.name ? `${clientDetails.name} Proforma Invoice.pdf` : 'Proforma Invoice.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }

  const calculateTotal = (item: InvoiceItem): string => {
    const rateNum = Number.parseFloat(item.rate) || 0

    if (item.sqft && item.sqft.trim() !== "") {
      const sqftNum = Number.parseFloat(item.sqft) || 0
      return (sqftNum * rateNum).toFixed(2)
    } else if (item.size && item.size.trim() !== "") {
      const sizeNum = Number.parseFloat(item.size) || 0
      return (sizeNum * rateNum).toFixed(2)
    }

    return "0.00"
  }

  const calculateGrandTotal = (): string => {
    if (rateOnlyMode) return "N/A"

    const total = items.reduce((sum, item) => {
      return sum + (Number.parseFloat(item.total || "0") || 0)
    }, 0)

    return `₹${total.toFixed(2)}`
  }

  const handleLogin = () => {
    if (username === FIXED_USERNAME && password === FIXED_PASSWORD) {
      setIsAuthenticated(true)
      setLoginError("")
      localStorage.setItem("marbleHouseAuth", "true")
    } else {
      setLoginError("Invalid username or password")
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem("marbleHouseAuth")
  }

  const handleInputChange = (field: keyof InvoiceItem, value: string) => {
    setCurrentItem((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleAddItem = () => {
    if (!currentItem.itemName) {
      toast.error("Item name is required");
      return;
    }

    const newItem = {
      ...currentItem,
      id: Date.now().toString(),
      total: rateOnlyMode ? undefined : calculateTotal(currentItem),
    };

    setItems([...items, newItem]);
    setCurrentItem({
      id: "",
      itemName: "",
      size: "",
      sqft: "",
      rate: "",
      remarks: "",
      finish: "",
    });
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const handleDownloadPDF = () => {
    // PDF generation logic would go here
    toast.success("PDF downloaded successfully");
  };

  const generatePDF = useCallback(async () => {
    if (!pdfRef.current) {
      console.error("PDF reference is null")
      alert("Could not find the content to generate PDF. Please try again.")
      return
    }

    setIsGeneratingPDF(true)
    try {
      const html2pdf = (await import('html2pdf.js')).default
      await html2pdf().set(pdfOptions).from(pdfRef.current).save()
    } catch (error) {
      console.error("PDF Generation Error:", error)
      alert("Failed to generate PDF. Please try again.")
    } finally {
      setIsGeneratingPDF(false)
    }
  }, [pdfOptions])

  const handleSendEmail = async () => {
    if (!clientDetails.email) {
      toast.error("Please enter an email address");
      return;
    }

    if (!pdfRef.current) {
      toast.error("Could not generate PDF. Please try again.");
      return;
    }

    setIsSendingEmail(true);
    try {
      // Generate PDF using html2pdf.js
      const html2pdf = (await import('html2pdf.js')).default;
      const pdfBuffer = await html2pdf()
        .set({
          margin: 1,
          filename: `${clientDetails.name} Proforma Invoice.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        })
        .from(pdfRef.current)
        .output('datauristring');

      // Extract base64 string from data URI
      const base64String = pdfBuffer.split(',')[1];

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientDetails: {
            name: clientDetails.name,
            phone: clientDetails.phone,
            email: clientDetails.email,
          },
          items: items.map(item => ({
            itemName: item.itemName,
            size: item.size,
            sqft: item.sqft,
            rate: item.rate,
            total: item.total,
            remarks: item.remarks,
          })),
          rateOnlyMode,
          calculateTotal: calculateGrandTotal().replace('₹', ''),
          pdfBuffer: base64String,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      toast.success("Email sent successfully");
    } catch (error: any) {
      console.error('Email sending error:', error);
      toast.error(error.message || "Failed to send email. Please try again.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!clientDetails.phone) {
      toast.error("Please enter a phone number");
      return;
    }

    // Format phone number (remove spaces, +, etc.)
    const formattedNumber = clientDetails.phone.replace(/\D/g, "");

    // Create WhatsApp message
    const message = encodeURIComponent(
      `Proforma Invoice from Our Own Marble House for ${clientDetails.name || "Client"}\nTotal: ${calculateGrandTotal()}`,
    );

    // Open WhatsApp with the message
    window.open(`https://wa.me/${formattedNumber}?text=${message}`, "_blank");
    toast.success("WhatsApp opened with proforma invoice details");
  };

  const handleModeToggle = (checked: boolean) => {
    setRateOnlyMode(checked)

    // Update existing items when mode changes
    if (items.length > 0) {
      if (checked) {
        // When switching to rate-only mode
        setItems(items.map((item) => ({ ...item, total: undefined })))
      } else {
        // When switching to full calculation mode
        setItems(
          items.map((item) => ({
            ...item,
            total: calculateTotal(item),
          })),
        )
      }
    }
  }

  const today = new Date()
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, "/")

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-[350px]">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Image
                src="/logo.png"
                alt="Our Own Marble House Logo"
                width={80}
                height={80}
              />
            </div>
            <CardTitle className="text-2xl font-bold text-[#14284b]">Our Own Marble House</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>
              {loginError && <p className="text-sm text-red-500">{loginError}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-[#14284b]" onClick={handleLogin}>
              Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Invoice creator (only shown when authenticated)
  return (
    <>
      <Toaster />
      {mounted && createPortal(
        <div className="fixed left-[-9999px] top-[-9999px] w-[210mm] h-[297mm] overflow-hidden pointer-events-none opacity-0">
          <PDFTemplate
            ref={pdfRef}
            items={items}
            clientDetails={clientDetails}
            calculateTotal={() => parseFloat(calculateGrandTotal().replace('₹', '')) || 0}
            rateOnlyMode={rateOnlyMode}
          />
        </div>,
        document.body
      )}
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="bg-white p-6 rounded-lg max-w-5xl mx-auto shadow-sm">
          {/* Header Section */}
          <div className="text-center mb-6 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 text-gray-500 hover:text-gray-700"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Logout</span>
            </Button>

            <div className="flex justify-center mb-2">
              <Image
                src="/logo.png"
                alt="Our Own Marble House Logo"
                width={100}
                height={100}
                className="mb-2"
              />
            </div>
            <h1 className="text-3xl font-bold text-[#14284b]">Our Own Marble House</h1>
            <p className="text-gray-600 mt-1">Thrissur Road, Irinjalakuda, Thrissur, Kerala 680121</p>
            <p className="text-gray-600">Phone: +91 70349 03099 | Email: ourownmarbles@gmail.com</p>
          </div>

          {/* Mode Toggle and Date */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-xl font-semibold text-[#14284b]">Proforma Invoice Creator</h2>
            <div className="flex items-center justify-end w-full sm:w-auto">
              <div className="flex items-center space-x-4 mr-6">
                <Switch id="mode-toggle" checked={rateOnlyMode} onCheckedChange={handleModeToggle} />
                <Label htmlFor="mode-toggle" className="text-sm font-medium">
                  {rateOnlyMode ? "Rate Only Mode" : "Full Calculation Mode"}
                </Label>
              </div>
              <p className="text-gray-600">Date: {today}</p>
            </div>
          </div>

          {/* Client Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label htmlFor="clientName" className="block text-[#14284b] font-medium mb-1">
                Client Name
              </label>
              <Input
                id="clientName"
                placeholder="Enter client name"
                value={clientDetails.name}
                onChange={(e) => setClientDetails((prev) => ({ ...prev, name: e.target.value }))}
                className="border-gray-300"
              />
            </div>
            <div>
              <label htmlFor="phoneNumber" className="block text-[#14284b] font-medium mb-1">
                Phone Number
              </label>
              <Input
                id="phoneNumber"
                placeholder="Enter phone number"
                value={clientDetails.phone}
                onChange={(e) => setClientDetails((prev) => ({ ...prev, phone: e.target.value }))}
                className="border-gray-300"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-[#14284b] font-medium mb-1">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={clientDetails.email}
                onChange={(e) => setClientDetails((prev) => ({ ...prev, email: e.target.value }))}
                className="border-gray-300"
              />
            </div>
          </div>

          {/* Item Form */}
          <div className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <div className="space-y-2">
                <label className="text-[#14284b] font-medium">Item Name</label>
                <Input
                  placeholder="Item name"
                  value={currentItem.itemName}
                  onChange={(e) => handleInputChange('itemName', e.target.value)}
                  className="input-custom"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[#14284b] font-medium">Size</label>
                <Input
                  placeholder="Size"
                  value={currentItem.size}
                  onChange={(e) => handleInputChange('size', e.target.value)}
                  className="input-custom"
                />
              </div>
              {rateOnlyMode ? (
                <div className="space-y-2">
                  <label className="text-[#14284b] font-medium">Finish</label>
                  <Input
                    placeholder="Finish"
                    value={currentItem.finish}
                    onChange={(e) => handleInputChange('finish', e.target.value)}
                    className="input-custom"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[#14284b] font-medium">Area (Sqft)</label>
                  <Input
                    placeholder="Area (Sqft)"
                    type="number"
                    value={currentItem.sqft}
                    onChange={(e) => handleInputChange('sqft', e.target.value)}
                    className="input-custom"
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[#14284b] font-medium">Rate</label>
                <Input
                  placeholder="Rate"
                  type="number"
                  value={currentItem.rate}
                  onChange={(e) => handleInputChange('rate', e.target.value)}
                  className="input-custom"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[#14284b] font-medium">Remarks</label>
                <Input
                  placeholder="Remarks"
                  value={currentItem.remarks}
                  onChange={(e) => handleInputChange('remarks', e.target.value)}
                  className="input-custom"
                />
              </div>
            </div>

            <Button className="w-full bg-[#14284b] hover:bg-[#0e1c36]" onClick={handleAddItem}>
              Add Item
            </Button>
          </div>

          {/* Items List */}
          {items.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h3 className="text-lg font-semibold mb-2">Items List</h3>
              <div className="relative">
                <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" style={{ maxHeight: '400px' }}>
                  <div className="min-w-[800px]">
                    <div
                      className="grid gap-2 mb-2 font-medium sticky top-0 bg-white z-10 py-2"
                      style={{
                        gridTemplateColumns: rateOnlyMode ? "1fr 1fr 1fr 1fr 1fr 80px" : "1fr 1fr 1fr 1fr 1fr 1fr 80px",
                      }}
                    >
                      <div>Item Name</div>
                      <div>Size</div>
                      {rateOnlyMode ? <div>Finish</div> : <div>Area (Sqft)</div>}
                      <div>Rate</div>
                      {!rateOnlyMode && <div>Total</div>}
                      <div>Remarks</div>
                      <div>Action</div>
                    </div>

                    <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" style={{ maxHeight: '350px' }}>
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="grid gap-2 py-2 border-b"
                          style={{
                            gridTemplateColumns: rateOnlyMode ? "1fr 1fr 1fr 1fr 1fr 80px" : "1fr 1fr 1fr 1fr 1fr 1fr 80px",
                          }}
                        >
                          <div>{item.itemName || "N/A"}</div>
                          <div>{item.size || "N/A"}</div>
                          {rateOnlyMode ? <div>{item.finish || "N/A"}</div> : <div>{item.sqft || "N/A"}</div>}
                          <div>{item.rate || "N/A"}</div>
                          {!rateOnlyMode && <div>₹{item.total || "0.00"}</div>}
                          <div>{item.remarks || "N/A"}</div>
                          <div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Totals and Actions */}
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-lg font-semibold">Total Items: {items.length}</div>
            {!rateOnlyMode && <div className="text-lg font-semibold">Grand Total: {calculateGrandTotal()}</div>}
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button className="bg-[#14284b] hover:bg-[#0e1c36]" onClick={generatePDF}>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>

            <Button 
              className="bg-[#14284b] hover:bg-[#0e1c36]"
              onClick={handleSendEmail}
              disabled={isSendingEmail}
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" /> Send via Email
                </>
              )}
            </Button>

            <Button
              className="bg-[#25D366] hover:bg-[#128C7E] text-white font-medium rounded-md shadow-sm flex items-center justify-center"
              onClick={handleSendWhatsApp}
            >
              <WhatsAppIcon />
              Send via WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
