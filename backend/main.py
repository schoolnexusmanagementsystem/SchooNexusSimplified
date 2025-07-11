from .api import auth, users, schools, students, staff, classes, attendance, assignments, grades, announcements, events, ai, bots, documents

# Include API routers
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(schools.router, prefix="/api")
app.include_router(students.router, prefix="/api")
app.include_router(staff.router, prefix="/api")
app.include_router(classes.router, prefix="/api")
app.include_router(attendance.router, prefix="/api")
app.include_router(assignments.router, prefix="/api")
app.include_router(grades.router, prefix="/api")
app.include_router(announcements.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(bots.router, prefix="/api")
app.include_router(documents.router, prefix="/api")