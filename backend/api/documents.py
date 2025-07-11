from fastapi import APIRouter, Depends, HTTPException, Response, Query
from fastapi.responses import StreamingResponse
from typing import Optional, List
from datetime import date, datetime
import io
import base64

from ..auth import get_current_user
from ..models import User, School, Student, Staff, SchoolClass
from ..document_service import document_service
from ..database import get_database

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.get("/student-id/{student_id}")
async def generate_student_id_card(
    student_id: str,
    current_user: User = Depends(get_current_user)
):
    """Generate student ID card"""
    try:
        # Check permissions
        if current_user.role not in ['super_admin', 'school_admin', 'staff']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Generate ID card
        id_card_bytes = await document_service.generate_student_id_card(
            student_id=student_id,
            school_id=current_user.school_id
        )
        
        return StreamingResponse(
            io.BytesIO(id_card_bytes),
            media_type="image/png",
            headers={"Content-Disposition": f"attachment; filename=student_id_{student_id}.png"}
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating ID card: {str(e)}")

@router.get("/staff-id/{staff_id}")
async def generate_staff_id_card(
    staff_id: str,
    current_user: User = Depends(get_current_user)
):
    """Generate staff ID card"""
    try:
        # Check permissions
        if current_user.role not in ['super_admin', 'school_admin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Generate ID card
        id_card_bytes = await document_service.generate_staff_id_card(
            staff_id=staff_id,
            school_id=current_user.school_id
        )
        
        return StreamingResponse(
            io.BytesIO(id_card_bytes),
            media_type="image/png",
            headers={"Content-Disposition": f"attachment; filename=staff_id_{staff_id}.png"}
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating ID card: {str(e)}")

@router.get("/academic-report/{student_id}")
async def generate_academic_report(
    student_id: str,
    academic_year: str = Query(..., description="Academic year (e.g., 2023-2024)"),
    term: str = Query(..., description="Term (e.g., First Term, Second Term)"),
    current_user: User = Depends(get_current_user)
):
    """Generate academic report for a student"""
    try:
        # Check permissions
        if current_user.role not in ['super_admin', 'school_admin', 'staff', 'parent']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # For parents, ensure they can only access their child's report
        if current_user.role == 'parent':
            db = next(get_database())
            try:
                # Check if student belongs to parent (would need parent-student relationship)
                # This is a simplified check - in real implementation, verify parent-student relationship
                pass
            finally:
                db.close()
        
        # Generate report
        report_bytes = await document_service.generate_academic_report(
            student_id=student_id,
            school_id=current_user.school_id,
            academic_year=academic_year,
            term=term
        )
        
        return StreamingResponse(
            io.BytesIO(report_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=academic_report_{student_id}_{academic_year}_{term}.pdf"}
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")

@router.get("/certificate/{certificate_type}/{recipient_id}")
async def generate_certificate(
    certificate_type: str,
    recipient_id: str,
    achievement: Optional[str] = Query(None, description="Achievement description"),
    activity: Optional[str] = Query(None, description="Activity description"),
    program: Optional[str] = Query(None, description="Program description"),
    current_user: User = Depends(get_current_user)
):
    """Generate various types of certificates"""
    try:
        # Check permissions
        if current_user.role not in ['super_admin', 'school_admin', 'staff']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Validate certificate type
        valid_types = ['completion', 'achievement', 'participation']
        if certificate_type not in valid_types:
            raise HTTPException(status_code=400, detail=f"Invalid certificate type. Must be one of: {valid_types}")
        
        # Prepare kwargs based on certificate type
        kwargs = {}
        if certificate_type == 'achievement' and achievement:
            kwargs['achievement'] = achievement
        elif certificate_type == 'participation' and activity:
            kwargs['activity'] = activity
        elif certificate_type == 'completion' and program:
            kwargs['program'] = program
        
        # Generate certificate
        certificate_bytes = await document_service.generate_certificate(
            certificate_type=certificate_type,
            recipient_id=recipient_id,
            school_id=current_user.school_id,
            **kwargs
        )
        
        return StreamingResponse(
            io.BytesIO(certificate_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=certificate_{certificate_type}_{recipient_id}.pdf"}
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating certificate: {str(e)}")

@router.get("/school-report/{report_type}")
async def generate_school_report(
    report_type: str,
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user)
):
    """Generate comprehensive school reports"""
    try:
        # Check permissions
        if current_user.role not in ['super_admin', 'school_admin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Parse dates
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d").date()
            end = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        # Generate report
        report_bytes = await document_service.generate_school_report(
            school_id=current_user.school_id,
            report_type=report_type,
            date_range=(start_date, end_date)
        )
        
        return StreamingResponse(
            io.BytesIO(report_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=school_report_{report_type}_{start_date}_{end_date}.pdf"}
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating school report: {str(e)}")

@router.get("/attendance-report/{class_id}")
async def generate_attendance_report(
    class_id: str,
    report_date: str = Query(..., description="Report date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user)
):
    """Generate daily attendance report for a class"""
    try:
        # Check permissions
        if current_user.role not in ['super_admin', 'school_admin', 'staff']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Parse date
        try:
            report_dt = datetime.strptime(report_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        # Generate report
        report_bytes = await document_service.generate_attendance_report(
            class_id=class_id,
            date=report_dt
        )
        
        return StreamingResponse(
            io.BytesIO(report_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=attendance_report_{class_id}_{report_date}.pdf"}
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating attendance report: {str(e)}")

@router.get("/bulk-id-cards")
async def generate_bulk_id_cards(
    user_type: str = Query(..., description="Type of users: 'students' or 'staff'"),
    user_ids: List[str] = Query(..., description="List of user IDs"),
    current_user: User = Depends(get_current_user)
):
    """Generate multiple ID cards and return as ZIP file"""
    try:
        # Check permissions
        if current_user.role not in ['super_admin', 'school_admin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Validate user type
        if user_type not in ['students', 'staff']:
            raise HTTPException(status_code=400, detail="Invalid user type. Must be 'students' or 'staff'")
        
        # This would require additional implementation for ZIP generation
        # For now, return a placeholder response
        raise HTTPException(status_code=501, detail="Bulk ID card generation not yet implemented")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating bulk ID cards: {str(e)}")

@router.get("/document-templates")
async def get_document_templates(current_user: User = Depends(get_current_user)):
    """Get available document templates"""
    templates = {
        "id_cards": {
            "student_id": {
                "name": "Student ID Card",
                "description": "Generate student identification card with photo, QR code, and barcode",
                "permissions": ["super_admin", "school_admin", "staff"],
                "parameters": ["student_id"]
            },
            "staff_id": {
                "name": "Staff ID Card", 
                "description": "Generate staff identification card with photo and QR code",
                "permissions": ["super_admin", "school_admin"],
                "parameters": ["staff_id"]
            }
        },
        "reports": {
            "academic_report": {
                "name": "Academic Report",
                "description": "Generate comprehensive academic performance report",
                "permissions": ["super_admin", "school_admin", "staff", "parent"],
                "parameters": ["student_id", "academic_year", "term"]
            },
            "school_report": {
                "name": "School Report",
                "description": "Generate comprehensive school statistics and performance report",
                "permissions": ["super_admin", "school_admin"],
                "parameters": ["report_type", "start_date", "end_date"]
            },
            "attendance_report": {
                "name": "Attendance Report",
                "description": "Generate daily attendance report for a class",
                "permissions": ["super_admin", "school_admin", "staff"],
                "parameters": ["class_id", "report_date"]
            }
        },
        "certificates": {
            "completion": {
                "name": "Certificate of Completion",
                "description": "Generate certificate for program completion",
                "permissions": ["super_admin", "school_admin", "staff"],
                "parameters": ["recipient_id", "program"]
            },
            "achievement": {
                "name": "Certificate of Achievement",
                "description": "Generate certificate for academic achievement",
                "permissions": ["super_admin", "school_admin", "staff"],
                "parameters": ["recipient_id", "achievement"]
            },
            "participation": {
                "name": "Certificate of Participation",
                "description": "Generate certificate for activity participation",
                "permissions": ["super_admin", "school_admin", "staff"],
                "parameters": ["recipient_id", "activity"]
            }
        }
    }
    
    return {"templates": templates}

@router.post("/custom-document")
async def generate_custom_document(
    template_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Generate custom document based on template data"""
    try:
        # Check permissions
        if current_user.role not in ['super_admin', 'school_admin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # This would be implemented for custom document generation
        # For now, return a placeholder response
        raise HTTPException(status_code=501, detail="Custom document generation not yet implemented")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating custom document: {str(e)}")