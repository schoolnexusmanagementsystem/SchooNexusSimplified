import asyncio
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, date
import io
import base64
from pathlib import Path
import json

from reportlab.lib.pagesizes import letter, A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from PIL import Image as PILImage, ImageDraw, ImageFont
import qrcode
from barcode import Code128
from barcode.writer import ImageWriter

from .database import get_database
from .models import User, School, Student, Staff, SchoolClass, Document
from .ai_service import AIService
from .utils import generate_id, format_date, format_phone

logger = logging.getLogger(__name__)

class DocumentService:
    """Comprehensive document generation service for school documents"""
    
    def __init__(self):
        self.ai_service = AIService()
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles for documents"""
        self.styles.add(ParagraphStyle(
            name='SchoolHeader',
            parent=self.styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=HexColor('#1e40af')
        ))
        
        self.styles.add(ParagraphStyle(
            name='DocumentTitle',
            parent=self.styles['Heading2'],
            fontSize=18,
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=HexColor('#374151')
        ))
        
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading3'],
            fontSize=14,
            spaceAfter=10,
            textColor=HexColor('#4b5563')
        ))
        
        self.styles.add(ParagraphStyle(
            name='BodyText',
            parent=self.styles['Normal'],
            fontSize=11,
            spaceAfter=6,
            textColor=HexColor('#1f2937')
        ))
    
    async def generate_student_id_card(self, student_id: str, school_id: str) -> bytes:
        """Generate a student ID card with photo, QR code, and barcode"""
        db = next(get_database())
        try:
            student = db.query(Student).filter(Student.id == student_id).first()
            school = db.query(School).filter(School.id == school_id).first()
            
            if not student or not school:
                raise ValueError("Student or school not found")
            
            # Create ID card image
            card_width, card_height = 600, 400
            card = PILImage.new('RGB', (card_width, card_height), white)
            draw = ImageDraw.Draw(card)
            
            # Try to load custom font, fallback to default
            try:
                title_font = ImageFont.truetype("arial.ttf", 24)
                header_font = ImageFont.truetype("arial.ttf", 18)
                body_font = ImageFont.truetype("arial.ttf", 14)
                small_font = ImageFont.truetype("arial.ttf", 12)
            except:
                title_font = ImageFont.load_default()
                header_font = ImageFont.load_default()
                body_font = ImageFont.load_default()
                small_font = ImageFont.load_default()
            
            # School header
            draw.rectangle([0, 0, card_width, 60], fill=HexColor('#1e40af'))
            draw.text((card_width//2, 30), school.name, fill=white, font=title_font, anchor="mm")
            
            # Student photo placeholder (would integrate with actual photo storage)
            photo_size = 120
            photo_x, photo_y = 30, 80
            draw.rectangle([photo_x, photo_y, photo_x + photo_size, photo_y + photo_size], 
                         outline=HexColor('#6b7280'), width=2)
            draw.text((photo_x + photo_size//2, photo_y + photo_size//2), "PHOTO", 
                     fill=HexColor('#9ca3af'), font=body_font, anchor="mm")
            
            # Student information
            info_x = photo_x + photo_size + 30
            info_y = photo_y + 10
            
            draw.text((info_x, info_y), f"Name: {student.first_name} {student.last_name}", 
                     fill=black, font=header_font)
            draw.text((info_x, info_y + 30), f"ID: {student.student_id}", 
                     fill=black, font=body_font)
            draw.text((info_x, info_y + 50), f"Class: {student.class_name}", 
                     fill=black, font=body_font)
            draw.text((info_x, info_y + 70), f"Grade: {student.grade_level}", 
                     fill=black, font=body_font)
            draw.text((info_x, info_y + 90), f"Valid: {datetime.now().year}-{datetime.now().year + 1}", 
                     fill=black, font=body_font)
            
            # QR Code
            qr_data = {
                "type": "student_id",
                "student_id": student.student_id,
                "school_id": school_id,
                "valid_until": f"{datetime.now().year + 1}-06-30"
            }
            qr = qrcode.QRCode(version=1, box_size=3, border=2)
            qr.add_data(json.dumps(qr_data))
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color="black", back_color="white")
            qr_img = qr_img.resize((80, 80))
            
            # Paste QR code
            card.paste(qr_img, (card_width - 100, card_height - 100))
            draw.text((card_width - 60, card_height - 20), "QR Code", 
                     fill=black, font=small_font, anchor="mm")
            
            # Barcode
            barcode_data = f"{school.code}{student.student_id}"
            barcode = Code128(barcode_data, writer=ImageWriter())
            barcode_img = barcode.render()
            barcode_img = barcode_img.resize((200, 40))
            
            # Paste barcode
            card.paste(barcode_img, (info_x, card_height - 60))
            draw.text((info_x + 100, card_height - 20), barcode_data, 
                     fill=black, font=small_font, anchor="mm")
            
            # Convert to bytes
            img_byte_arr = io.BytesIO()
            card.save(img_byte_arr, format='PNG')
            img_byte_arr.seek(0)
            
            return img_byte_arr.getvalue()
            
        finally:
            db.close()
    
    async def generate_staff_id_card(self, staff_id: str, school_id: str) -> bytes:
        """Generate a staff ID card"""
        db = next(get_database())
        try:
            staff = db.query(Staff).filter(Staff.id == staff_id).first()
            school = db.query(School).filter(School.id == school_id).first()
            
            if not staff or not school:
                raise ValueError("Staff or school not found")
            
            # Similar to student ID but with staff-specific information
            card_width, card_height = 600, 400
            card = PILImage.new('RGB', (card_width, card_height), white)
            draw = ImageDraw.Draw(card)
            
            try:
                title_font = ImageFont.truetype("arial.ttf", 24)
                header_font = ImageFont.truetype("arial.ttf", 18)
                body_font = ImageFont.truetype("arial.ttf", 14)
            except:
                title_font = ImageFont.load_default()
                header_font = ImageFont.load_default()
                body_font = ImageFont.load_default()
            
            # School header
            draw.rectangle([0, 0, card_width, 60], fill=HexColor('#059669'))
            draw.text((card_width//2, 30), f"{school.name} - Staff ID", fill=white, font=title_font, anchor="mm")
            
            # Staff photo placeholder
            photo_size = 120
            photo_x, photo_y = 30, 80
            draw.rectangle([photo_x, photo_y, photo_x + photo_size, photo_y + photo_size], 
                         outline=HexColor('#6b7280'), width=2)
            draw.text((photo_x + photo_size//2, photo_y + photo_size//2), "PHOTO", 
                     fill=HexColor('#9ca3af'), font=body_font, anchor="mm")
            
            # Staff information
            info_x = photo_x + photo_size + 30
            info_y = photo_y + 10
            
            draw.text((info_x, info_y), f"Name: {staff.first_name} {staff.last_name}", 
                     fill=black, font=header_font)
            draw.text((info_x, info_y + 30), f"ID: {staff.employee_id}", 
                     fill=black, font=body_font)
            draw.text((info_x, info_y + 50), f"Position: {staff.position}", 
                     fill=black, font=body_font)
            draw.text((info_x, info_y + 70), f"Department: {staff.department}", 
                     fill=black, font=body_font)
            draw.text((info_x, info_y + 90), f"Valid: {datetime.now().year}-{datetime.now().year + 1}", 
                     fill=black, font=body_font)
            
            # QR Code for staff
            qr_data = {
                "type": "staff_id",
                "employee_id": staff.employee_id,
                "school_id": school_id,
                "valid_until": f"{datetime.now().year + 1}-06-30"
            }
            qr = qrcode.QRCode(version=1, box_size=3, border=2)
            qr.add_data(json.dumps(qr_data))
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color="black", back_color="white")
            qr_img = qr_img.resize((80, 80))
            
            card.paste(qr_img, (card_width - 100, card_height - 100))
            
            # Convert to bytes
            img_byte_arr = io.BytesIO()
            card.save(img_byte_arr, format='PNG')
            img_byte_arr.seek(0)
            
            return img_byte_arr.getvalue()
            
        finally:
            db.close()
    
    async def generate_academic_report(self, student_id: str, school_id: str, 
                                     academic_year: str, term: str) -> bytes:
        """Generate a comprehensive academic report PDF"""
        db = next(get_database())
        try:
            student = db.query(Student).filter(Student.id == student_id).first()
            school = db.query(School).filter(School.id == school_id).first()
            
            if not student or not school:
                raise ValueError("Student or school not found")
            
            # Create PDF
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4)
            story = []
            
            # School header
            story.append(Paragraph(school.name, self.styles['SchoolHeader']))
            story.append(Paragraph("Academic Report", self.styles['DocumentTitle']))
            story.append(Spacer(1, 20))
            
            # Student information table
            student_data = [
                ['Student Information', ''],
                ['Name:', f"{student.first_name} {student.last_name}"],
                ['Student ID:', student.student_id],
                ['Class:', student.class_name],
                ['Grade Level:', student.grade_level],
                ['Academic Year:', academic_year],
                ['Term:', term],
                ['Report Date:', datetime.now().strftime('%B %d, %Y')]
            ]
            
            student_table = Table(student_data, colWidths=[2*inch, 4*inch])
            student_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1e40af')),
                ('TEXTCOLOR', (0, 0), (-1, 0), white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f8fafc')),
                ('GRID', (0, 0), (-1, -1), 1, black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            
            story.append(student_table)
            story.append(Spacer(1, 20))
            
            # Academic performance section
            story.append(Paragraph("Academic Performance", self.styles['SectionHeader']))
            
            # Mock grades data (would come from database)
            grades_data = [
                ['Subject', 'Grade', 'Percentage', 'Remarks'],
                ['Mathematics', 'A', '92%', 'Excellent'],
                ['English', 'B+', '87%', 'Good'],
                ['Science', 'A-', '89%', 'Very Good'],
                ['History', 'B', '83%', 'Good'],
                ['Geography', 'A', '91%', 'Excellent'],
                ['Physical Education', 'A', '95%', 'Outstanding']
            ]
            
            grades_table = Table(grades_data, colWidths=[2*inch, 1*inch, 1*inch, 2*inch])
            grades_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#059669')),
                ('TEXTCOLOR', (0, 0), (-1, 0), white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), white),
                ('GRID', (0, 0), (-1, -1), 1, black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            
            story.append(grades_table)
            story.append(Spacer(1, 20))
            
            # Attendance summary
            story.append(Paragraph("Attendance Summary", self.styles['SectionHeader']))
            
            attendance_data = [
                ['Total Days', 'Present', 'Absent', 'Late', 'Attendance Rate'],
                ['180', '165', '10', '5', '91.7%']
            ]
            
            attendance_table = Table(attendance_data, colWidths=[1.2*inch, 1.2*inch, 1.2*inch, 1.2*inch, 1.2*inch])
            attendance_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#dc2626')),
                ('TEXTCOLOR', (0, 0), (-1, 0), white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), white),
                ('GRID', (0, 0), (-1, -1), 1, black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            
            story.append(attendance_table)
            story.append(Spacer(1, 20))
            
            # Teacher comments
            story.append(Paragraph("Teacher Comments", self.styles['SectionHeader']))
            story.append(Paragraph(
                f"{student.first_name} has shown excellent progress this term. "
                "They demonstrate strong analytical skills in mathematics and "
                "show great enthusiasm for learning. Continued focus on time "
                "management will help achieve even better results.",
                self.styles['BodyText']
            ))
            story.append(Spacer(1, 20))
            
            # Recommendations
            story.append(Paragraph("Recommendations", self.styles['SectionHeader']))
            story.append(Paragraph(
                "• Continue with current study habits<br/>"
                "• Participate more in class discussions<br/>"
                "• Focus on improving writing skills<br/>"
                "• Consider joining extracurricular activities",
                self.styles['BodyText']
            ))
            story.append(Spacer(1, 30))
            
            # Signature section
            signature_data = [
                ['Class Teacher', 'Principal', 'Parent/Guardian'],
                ['', '', ''],
                ['Date:', 'Date:', 'Date:']
            ]
            
            signature_table = Table(signature_data, colWidths=[2*inch, 2*inch, 2*inch])
            signature_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('GRID', (0, 0), (-1, -1), 1, black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            
            story.append(signature_table)
            
            # Build PDF
            doc.build(story)
            buffer.seek(0)
            return buffer.getvalue()
            
        finally:
            db.close()
    
    async def generate_certificate(self, certificate_type: str, recipient_id: str, 
                                 school_id: str, **kwargs) -> bytes:
        """Generate various types of certificates"""
        db = next(get_database())
        try:
            school = db.query(School).filter(School.id == school_id).first()
            
            if not school:
                raise ValueError("School not found")
            
            # Get recipient information based on type
            if certificate_type == "completion":
                recipient = db.query(Student).filter(Student.id == recipient_id).first()
                title = "Certificate of Completion"
                description = f"This is to certify that {recipient.first_name} {recipient.last_name} has successfully completed the {kwargs.get('program', 'academic program')}."
            elif certificate_type == "achievement":
                recipient = db.query(Student).filter(Student.id == recipient_id).first()
                title = "Certificate of Achievement"
                description = f"This is to certify that {recipient.first_name} {recipient.last_name} has achieved excellence in {kwargs.get('achievement', 'academic performance')}."
            elif certificate_type == "participation":
                recipient = db.query(Student).filter(Student.id == recipient_id).first()
                title = "Certificate of Participation"
                description = f"This is to certify that {recipient.first_name} {recipient.last_name} has actively participated in {kwargs.get('activity', 'school activities')}."
            else:
                raise ValueError("Invalid certificate type")
            
            # Create certificate PDF
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=landscape(A4))
            story = []
            
            # Certificate border
            def add_border(canvas, doc):
                canvas.saveState()
                canvas.setStrokeColor(HexColor('#1e40af'))
                canvas.setLineWidth(3)
                canvas.rect(0.5*inch, 0.5*inch, doc.width + inch, doc.height + inch)
                canvas.restoreState()
            
            # Certificate content
            story.append(Spacer(1, 2*inch))
            story.append(Paragraph(school.name, self.styles['SchoolHeader']))
            story.append(Spacer(1, 0.5*inch))
            story.append(Paragraph(title, self.styles['DocumentTitle']))
            story.append(Spacer(1, inch))
            
            # Recipient name
            recipient_style = ParagraphStyle(
                'RecipientName',
                parent=self.styles['Normal'],
                fontSize=24,
                alignment=TA_CENTER,
                textColor=HexColor('#1e40af'),
                spaceAfter=20
            )
            story.append(Paragraph(f"{recipient.first_name} {recipient.last_name}", recipient_style))
            story.append(Spacer(1, 0.5*inch))
            
            # Description
            desc_style = ParagraphStyle(
                'Description',
                parent=self.styles['Normal'],
                fontSize=14,
                alignment=TA_CENTER,
                textColor=HexColor('#374151'),
                spaceAfter=30
            )
            story.append(Paragraph(description, desc_style))
            
            # Date
            date_style = ParagraphStyle(
                'Date',
                parent=self.styles['Normal'],
                fontSize=12,
                alignment=TA_CENTER,
                textColor=HexColor('#6b7280')
            )
            story.append(Paragraph(f"Date: {datetime.now().strftime('%B %d, %Y')}", date_style))
            story.append(Spacer(1, inch))
            
            # Signatures
            signature_data = [
                ['', '', ''],
                ['Principal', 'Class Teacher', 'School Seal'],
                ['', '', '']
            ]
            
            signature_table = Table(signature_data, colWidths=[2*inch, 2*inch, 2*inch])
            signature_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 1), (-1, 1), 11),
                ('GRID', (0, 0), (-1, -1), 1, HexColor('#d1d5db')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            
            story.append(signature_table)
            
            # Build PDF with border
            doc.build(story, onFirstPage=add_border, onLaterPages=add_border)
            buffer.seek(0)
            return buffer.getvalue()
            
        finally:
            db.close()
    
    async def generate_school_report(self, school_id: str, report_type: str, 
                                   date_range: tuple) -> bytes:
        """Generate comprehensive school reports"""
        db = next(get_database())
        try:
            school = db.query(School).filter(School.id == school_id).first()
            
            if not school:
                raise ValueError("School not found")
            
            # Create PDF
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4)
            story = []
            
            # Header
            story.append(Paragraph(school.name, self.styles['SchoolHeader']))
            story.append(Paragraph(f"{report_type.title()} Report", self.styles['DocumentTitle']))
            story.append(Paragraph(f"Period: {date_range[0]} to {date_range[1]}", self.styles['BodyText']))
            story.append(Spacer(1, 20))
            
            # School statistics
            story.append(Paragraph("School Statistics", self.styles['SectionHeader']))
            
            # Mock statistics (would come from database)
            stats_data = [
                ['Metric', 'Count', 'Percentage'],
                ['Total Students', '1,250', '100%'],
                ['Male Students', '620', '49.6%'],
                ['Female Students', '630', '50.4%'],
                ['Teaching Staff', '85', '100%'],
                ['Support Staff', '45', '100%'],
                ['Average Attendance', '94.2%', ''],
                ['Graduation Rate', '98.5%', '']
            ]
            
            stats_table = Table(stats_data, colWidths=[3*inch, 1.5*inch, 1.5*inch])
            stats_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1e40af')),
                ('TEXTCOLOR', (0, 0), (-1, 0), white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f8fafc')),
                ('GRID', (0, 0), (-1, -1), 1, black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            
            story.append(stats_table)
            story.append(Spacer(1, 20))
            
            # Academic performance summary
            story.append(Paragraph("Academic Performance Summary", self.styles['SectionHeader']))
            
            performance_data = [
                ['Grade Level', 'Average GPA', 'Pass Rate', 'Top Performers'],
                ['Grade 9', '3.2', '95%', '15 students'],
                ['Grade 10', '3.1', '93%', '12 students'],
                ['Grade 11', '3.3', '96%', '18 students'],
                ['Grade 12', '3.4', '98%', '22 students']
            ]
            
            performance_table = Table(performance_data, colWidths=[1.5*inch, 1.5*inch, 1.5*inch, 1.5*inch])
            performance_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#059669')),
                ('TEXTCOLOR', (0, 0), (-1, 0), white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), white),
                ('GRID', (0, 0), (-1, -1), 1, black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            
            story.append(performance_table)
            story.append(Spacer(1, 20))
            
            # Recommendations
            story.append(Paragraph("Recommendations", self.styles['SectionHeader']))
            story.append(Paragraph(
                "• Continue monitoring student attendance patterns<br/>"
                "• Implement additional support programs for struggling students<br/>"
                "• Enhance teacher professional development opportunities<br/>"
                "• Strengthen parent-teacher communication channels<br/>"
                "• Invest in technology infrastructure improvements",
                self.styles['BodyText']
            ))
            
            # Build PDF
            doc.build(story)
            buffer.seek(0)
            return buffer.getvalue()
            
        finally:
            db.close()
    
    async def generate_attendance_report(self, class_id: str, date: date) -> bytes:
        """Generate daily attendance report for a class"""
        db = next(get_database())
        try:
            # Get class and students
            school_class = db.query(SchoolClass).filter(SchoolClass.id == class_id).first()
            
            if not school_class:
                raise ValueError("Class not found")
            
            # Create PDF
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4)
            story = []
            
            # Header
            story.append(Paragraph("Daily Attendance Report", self.styles['DocumentTitle']))
            story.append(Paragraph(f"Class: {school_class.name}", self.styles['SectionHeader']))
            story.append(Paragraph(f"Date: {date.strftime('%B %d, %Y')}", self.styles['BodyText']))
            story.append(Spacer(1, 20))
            
            # Mock attendance data (would come from database)
            attendance_data = [
                ['Student Name', 'Student ID', 'Status', 'Time', 'Remarks'],
                ['John Doe', 'STU001', 'Present', '8:00 AM', ''],
                ['Jane Smith', 'STU002', 'Present', '8:02 AM', ''],
                ['Mike Johnson', 'STU003', 'Late', '8:15 AM', 'Traffic'],
                ['Sarah Wilson', 'STU004', 'Absent', '', 'Sick'],
                ['Tom Brown', 'STU005', 'Present', '8:01 AM', '']
            ]
            
            attendance_table = Table(attendance_data, colWidths=[2*inch, 1.5*inch, 1*inch, 1*inch, 1.5*inch])
            attendance_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#dc2626')),
                ('TEXTCOLOR', (0, 0), (-1, 0), white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), white),
                ('GRID', (0, 0), (-1, -1), 1, black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            
            story.append(attendance_table)
            story.append(Spacer(1, 20))
            
            # Summary
            story.append(Paragraph("Summary", self.styles['SectionHeader']))
            summary_data = [
                ['Total Students', 'Present', 'Absent', 'Late', 'Attendance Rate'],
                ['5', '3', '1', '1', '80%']
            ]
            
            summary_table = Table(summary_data, colWidths=[1.2*inch, 1.2*inch, 1.2*inch, 1.2*inch, 1.2*inch])
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#059669')),
                ('TEXTCOLOR', (0, 0), (-1, 0), white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), white),
                ('GRID', (0, 0), (-1, -1), 1, black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            
            story.append(summary_table)
            
            # Build PDF
            doc.build(story)
            buffer.seek(0)
            return buffer.getvalue()
            
        finally:
            db.close()

# Global document service instance
document_service = DocumentService()