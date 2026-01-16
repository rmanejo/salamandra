from django.http import FileResponse
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError, NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from salamandra_sge.accounts.permissions import IsProfessor, IsSchoolNotBlocked
from salamandra_sge.relatorios.services import ReportService

from .engine.caderneta import gerar_caderneta_documento
from .models import GeneratedDocument, ProfessorProfile
from .serializers import CadernetaGenerateSerializer, ProfessorProfileSerializer


class ProfessorProfileStatusView(APIView):
    permission_classes = [IsAuthenticated, IsProfessor]

    def get(self, request):
        profile, _ = ProfessorProfile.objects.get_or_create(professor=request.user.docente_profile)
        return Response(
            {
                "is_complete": profile.is_complete,
                "missing_fields": profile.missing_fields(),
            }
        )


class ProfessorProfileView(APIView):
    permission_classes = [IsAuthenticated, IsProfessor]

    def get(self, request):
        profile, _ = ProfessorProfile.objects.get_or_create(professor=request.user.docente_profile)
        serializer = ProfessorProfileSerializer(profile)
        return Response(serializer.data)

    def put(self, request):
        return self._update(request, partial=False)

    def patch(self, request):
        return self._update(request, partial=True)

    def _update(self, request, partial):
        profile, _ = ProfessorProfile.objects.get_or_create(professor=request.user.docente_profile)
        serializer = ProfessorProfileSerializer(profile, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class CadernetaGenerateView(APIView):
    permission_classes = [IsAuthenticated, IsProfessor, IsSchoolNotBlocked]

    def post(self, request):
        serializer = CadernetaGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            documents = gerar_caderneta_documento(
                user=request.user,
                turma_id=data["turma_id"],
                disciplina_id=data["disciplina_id"],
                trimestre=data["trimestre"],
                ano_lectivo=data.get("ano_lectivo"),
            )
        except PermissionError as exc:
            raise PermissionDenied(str(exc)) from exc
        except FileNotFoundError as exc:
            raise ValidationError(str(exc)) from exc
        except (ValueError, KeyError) as exc:
            raise ValidationError(str(exc)) from exc

        if len(documents) == 1:
            doc = documents[0]
            return Response(
                {
                    "document_id": doc.id,
                    "file_url": doc.file.url,
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(
            {
                "documents": [
                    {
                        "document_id": doc.id,
                        "file_url": doc.file.url,
                        "part_number": doc.part_number,
                        "parts_total": doc.parts_total,
                    }
                    for doc in documents
                ]
            },
            status=status.HTTP_201_CREATED,
        )


class DocumentDownloadView(APIView):
    permission_classes = [IsAuthenticated, IsSchoolNotBlocked]

    def get(self, request, doc_id):
        try:
            document = GeneratedDocument.objects.select_related("turma", "disciplina").get(
                id=doc_id, school=request.user.school
            )
        except GeneratedDocument.DoesNotExist:
            raise NotFound("Documento não encontrado.")

        if not ReportService._can_view_caderneta(request.user, document.turma, document.disciplina):
            raise PermissionDenied("Sem permissão para baixar este documento.")

        response = FileResponse(document.file.open("rb"), as_attachment=True)
        response["Content-Disposition"] = f'attachment; filename="{document.file.name.split("/")[-1]}"'
        return response
