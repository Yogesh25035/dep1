from django.urls import path
from . import views

urlpatterns = [
    path('api/predict/', views.predict_view, name='api_predict'),
    path('api/upload/', views.upload_view, name='api_upload'),
    path('api/logs/', views.logs_view, name='api_logs'),
    path('api/clear/', views.clear_logs_view, name='api_clear'),
]
