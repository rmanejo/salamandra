from django.urls import path

from .views import (
    CadernetaGenerateView,
    DocumentDownloadView,
    ProfessorProfileStatusView,
    ProfessorProfileView,
)

urlpatterns = [
    path("me/profile-status/", ProfessorProfileStatusView.as_view(), name="profile-status"),
    path("me/profile/", ProfessorProfileView.as_view(), name="profile"),
    path("documentos/caderneta/gerar/", CadernetaGenerateView.as_view(), name="caderneta-gerar"),
    path("documentos/<int:doc_id>/download/", DocumentDownloadView.as_view(), name="document-download"),
]
