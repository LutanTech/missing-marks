from flask import Flask, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime, timedelta
from fpdf import FPDF
import uuid, io

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///exam_missing_marks.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'exam_portal_secret'

db = SQLAlchemy(app)

# Admin Auth Tokens
ADMIN_OTP = "OTP/23"
EDIT_TOKEN = "edit/23"

class MissingMarkSubmission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    reference_id = db.Column(db.String(20), unique=True, nullable=False)
    adm_number = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    course_code = db.Column(db.String(50), nullable=False)
    course_title = db.Column(db.String(200), nullable=False)
    session = db.Column(db.String(50), nullable=False)
    lecturer_name = db.Column(db.String(120), nullable=False)
    submitted_at = db.Column(db.DateTime, nullable=False)

    def to_dict(self):
        return {
            "reference_id": self.reference_id,
            "adm_number": self.adm_number,
            "name": self.name,
            "course_code": self.course_code,
            "course_title": self.course_title,
            "session": self.session,
            "lecturer_name": self.lecturer_name,
            "submitted_at": self.submitted_at.strftime("%Y-%m-%d %H:%M:%S")
        }

class PDF(FPDF):
    def footer(self):
        self.set_y(-15)
        self.set_font("Times", 'I', 8)
        self.cell(0, 10, f"Page {self.page_no()} | Missing Marks Verification Report", 0, 0, 'C')

@app.route('/')
def home():
    return jsonify({"message": "Exam Missing Marks API is live!"})

@app.route('/submission/missing-marks', methods=['POST'])
def submit_missing_mark():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        exists = MissingMarkSubmission.query.filter_by(
            adm_number=data.get('admNumber'), 
            course_code=data.get('courseCode')
        ).first()
        
        if exists:
            return jsonify({'error': f'A missing mark claim already exists for {data.get("courseCode")}'}), 400

        ref = "MMK-" + uuid.uuid4().hex[:6].upper()
        now = datetime.utcnow() + timedelta(hours=3)

        submission = MissingMarkSubmission(
            reference_id=ref,
            adm_number=data.get('admNumber'),
            name=data.get('name'),
            course_code=data.get('courseCode'),
            course_title=data.get('courseTitle'),
            session=data.get('session'),
            lecturer_name=data.get('lecturerName'),
            submitted_at=now
        )

        db.session.add(submission)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": "Missing mark details recorded successfully.",
            "reference_id": ref
        }), 201

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/all-sas-submissions', methods=['GET'])
def get_all_submissions():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    pagination = MissingMarkSubmission.query.order_by(MissingMarkSubmission.submitted_at.desc()).paginate(page=page, per_page=per_page)
    
    return jsonify({
        "total": pagination.total,
        "pages": pagination.pages,
        "page": pagination.page,
        "data": [s.to_dict() for s in pagination.items]
    })

@app.route('/edit/att/<ref>', methods=['POST'])
def edit_submission(ref):
    otp = request.args.get('otp')
    if otp != EDIT_TOKEN:
        return jsonify({'error': 'Unauthorized edit token'}), 401
    
    submission = MissingMarkSubmission.query.filter_by(reference_id=ref).first_or_404()
    data = request.get_json()
    
    if 'name' in data:
        submission.name = data['name']
    
    db.session.commit()
    return jsonify({'message': 'Update successful'})

@app.route('/delete/sas/<ref>', methods=['DELETE'])
def delete_submission(ref):
    otp = request.args.get('otp')
    if otp != ADMIN_OTP:
        return jsonify({'error': 'Unauthorized admin OTP'}), 401
    
    submission = MissingMarkSubmission.query.filter_by(reference_id=ref).first_or_404()
    db.session.delete(submission)
    db.session.commit()
    return jsonify({'message': 'Record deleted successfully'})

@app.route('/download-missing-marks-pdf', methods=['GET'])
def download_pdf():
    submissions = MissingMarkSubmission.query.order_by(MissingMarkSubmission.submitted_at.asc()).all()
    pdf = PDF(orientation='L', unit='mm', format='A4')
    pdf.add_page()
    
    pdf.set_font("Times", 'B', 16)
    pdf.cell(0, 12, "EXAM MISSING MARKS CONSOLIDATED REPORT", ln=True, align='C')
    pdf.set_font("Times", '', 10)
    pdf.cell(0, 8, f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", ln=True, align='C')
    pdf.ln(10)
    
    pdf.set_font("Times", 'B', 10)
    pdf.set_fill_color(220, 220, 220)
    
    pdf.cell(12, 10, "#", 1, 0, 'C', True)
    pdf.cell(33, 10, "ADM NUMBER", 1, 0, 'C', True)
    pdf.cell(55, 10, "STUDENT NAME", 1, 0, 'C', True)
    pdf.cell(30, 10, "UNIT CODE", 1, 0, 'C', True)
    pdf.cell(75, 10, "UNIT TITLE", 1, 0, 'C', True)
    pdf.cell(25, 10, "SESSION", 1, 0, 'C', True)
    pdf.cell(0, 10, "LECTURER", 1, 1, 'C', True)

    fill = False
    for i, s in enumerate(submissions, 1):
        if fill:
            pdf.set_fill_color(245, 245, 245)
        else:
            pdf.set_fill_color(255, 255, 255)
            
        pdf.set_font("Times", '', 10)
        pdf.cell(12, 8, str(i), 1, 0, 'C', True)
        pdf.cell(33, 8, s.adm_number, 1, 0, 'L', True)
        pdf.cell(55, 8, s.name[:35], 1, 0, 'L', True)
        pdf.cell(30, 8, s.course_code, 1, 0, 'C', True)
        
        pdf.set_font("Times", '', 8)
        pdf.cell(75, 8, s.course_title[:55], 1, 0, 'L', True)
        
        pdf.set_font("Times", '', 10)
        pdf.cell(25, 8, s.session, 1, 0, 'C', True)
        pdf.cell(0, 8, s.lecturer_name[:35], 1, 1, 'L', True)
        fill = not fill

    pdf_bytes = pdf.output(dest='S').encode('latin-1')
    return send_file(io.BytesIO(pdf_bytes), as_attachment=True, download_name="missing_marks_records.pdf", mimetype='application/pdf')

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, port=7820)