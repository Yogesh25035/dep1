from django.db import models

class PredictionLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    source_ip = models.GenericIPAddressField(null=True, blank=True)
    protocol = models.CharField(max_length=50, null=True, blank=True)
    label = models.CharField(max_length=50) # 'Attack' or 'Normal'
    confidence = models.FloatField()
    attack_type = models.CharField(max_length=100)
    payload = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.timestamp} - {self.source_ip} - {self.label} ({self.confidence}%)"
