import os
import json
import joblib
import pandas as pd
import numpy as np
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.paginator import Paginator
from .models import PredictionLog

# Paths to ML models
MODEL_DIR = os.path.join(settings.BASE_DIR, 'ml_models')
MODEL_PATH = os.path.join(MODEL_DIR, 'rf_model.pkl')
SCALER_PATH = os.path.join(MODEL_DIR, 'scaler.pkl')
ENCODER_PATH = os.path.join(MODEL_DIR, 'label_encoders.pkl')
FEATURES_PATH = os.path.join(MODEL_DIR, 'features.pkl')

rf_model, scaler, label_encoders, expected_features = None, None, None, []
def load_ml_assets():
    global rf_model, scaler, label_encoders, expected_features
    if os.path.exists(MODEL_PATH):
        try:
            rf_model = joblib.load(MODEL_PATH)
            if os.path.exists(SCALER_PATH):
                scaler = joblib.load(SCALER_PATH)
            if os.path.exists(ENCODER_PATH):
                label_encoders = joblib.load(ENCODER_PATH)
            if os.path.exists(FEATURES_PATH):
                expected_features = joblib.load(FEATURES_PATH)
        except Exception as e:
            print("Failed to load ML artifacts:", e)

load_ml_assets()

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    return x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')

def preprocess_input(df_input):
    if label_encoders is None or scaler is None:
        raise ValueError("ML Modeles (Scalers/Encoders) not fully loaded.")
        
    categorical_cols = ['protocol_type', 'service', 'flag']
    for col in categorical_cols:
        if col in df_input.columns:
            le = label_encoders.get(col)
            if le:
                classes = list(le.classes_)
                df_input[col] = df_input[col].apply(lambda x: x if x in classes else classes[0])
                df_input[col] = le.transform(df_input[col].astype(str))
                
    for col in expected_features:
        if col not in df_input.columns:
            df_input[col] = 0
            
    df_input = df_input[expected_features]
    return scaler.transform(df_input)

@csrf_exempt
def predict_view(request):
    if request.method == 'POST':
        try:
            body = json.loads(request.body)
            features = body.get('features', {})
            
            if rf_model is None:
                return JsonResponse({'error': 'Machine learning model not found'}, status=500)
            
            if isinstance(features, list):
                df_input = pd.DataFrame([features], columns=expected_features[:len(features)])
            else:
                df_input = pd.DataFrame([features])
                
            X_scaled = preprocess_input(df_input)
            pred = str(rf_model.predict(X_scaled)[0])
            if pred == '1':
                pred = 'Attack'
            elif pred == '0':
                pred = 'Normal'
            probs = rf_model.predict_proba(X_scaled)[0]
            confidence = float(round(max(probs) * 100, 2))
            attack_type = 'DoS' if pred == 'Attack' else 'None'
            
            PredictionLog.objects.create(
                source_ip=get_client_ip(request),
                protocol=str(features.get('protocol_type', 'unknown')) if isinstance(features, dict) else 'unknown',
                label=pred,
                confidence=confidence,
                attack_type=attack_type
            )
            
            return JsonResponse({
                'prediction': pred,
                'confidence': confidence,
                'attack_type': attack_type
            })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'POST required'}, status=405)

@csrf_exempt
def upload_view(request):
    if request.method == 'POST':
        try:
            if 'file' not in request.FILES:
                return JsonResponse({'error': 'No file part'}, status=400)
                
            if rf_model is None:
                return JsonResponse({'error': 'Machine learning model not found'}, status=500)
                
            file = request.FILES['file']
            df_input = pd.read_csv(file)
            X_scaled = preprocess_input(df_input.copy())
            
            preds = rf_model.predict(X_scaled)
            probs = rf_model.predict_proba(X_scaled)
            
            logs = []
            source_ip = get_client_ip(request)
            results = []
            
            for i, p in enumerate(preds):
                conf = float(round(max(probs[i]) * 100, 2))
                pred_str = str(p)
                if pred_str == '1': pred_str = 'Attack'
                elif pred_str == '0': pred_str = 'Normal'
                
                results.append({'row': int(i), 'prediction': pred_str, 'confidence': conf})
                logs.append(PredictionLog(
                    source_ip=source_ip,
                    label=pred_str,
                    confidence=conf,
                    attack_type='Batch Upload Analysis'
                ))
            
            if logs:
                PredictionLog.objects.bulk_create(logs, batch_size=1000)
                
            return JsonResponse({'results': results[:500]})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'POST required'}, status=405)

def logs_view(request):
    if request.method == 'GET':
        page_number = int(request.GET.get('page', 1))
        per_page = int(request.GET.get('limit', 50))
        logs = PredictionLog.objects.all().values(
            'timestamp', 'source_ip', 'protocol', 'label', 'confidence', 'attack_type'
        )
        paginator = Paginator(logs, per_page)
        
        try:
            page_obj = paginator.get_page(page_number)
            data = list(page_obj)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
            
        total_packets = PredictionLog.objects.count()
        attacks_detected = PredictionLog.objects.filter(label__in=['Attack', '1']).count()
        
        return JsonResponse({
            'logs': data,
            'total_pages': paginator.num_pages,
            'current_page': page_obj.number,
            'stats': {
                'total': total_packets,
                'attacks': attacks_detected
            }
        })
    return JsonResponse({'error': 'GET required'}, status=405)

@csrf_exempt
def clear_logs_view(request):
    if request.method in ['POST', 'DELETE']:
        PredictionLog.objects.all().delete()
        return JsonResponse({'status': 'Session cleared successfully'})
    return JsonResponse({'error': 'Invalid method'}, status=405)
