# Generated migration for initial models

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Task',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('in_progress', 'In Progress'), ('completed', 'Completed'), ('blocked', 'Blocked')], default='pending', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'tasks',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='TaskDependency',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('depends_on', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='dependent_tasks', to='tasks.task')),
                ('task', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='dependencies', to='tasks.task')),
            ],
            options={
                'db_table': 'task_dependencies',
            },
        ),
        migrations.AddConstraint(
            model_name='taskdependency',
            constraint=models.UniqueConstraint(fields=('task', 'depends_on'), name='unique_task_dependency'),
        ),
        migrations.AddIndex(
            model_name='taskdependency',
            index=models.Index(fields=['task'], name='task_dependencies_task_id_idx'),
        ),
        migrations.AddIndex(
            model_name='taskdependency',
            index=models.Index(fields=['depends_on'], name='task_dependencies_depends_on_id_idx'),
        ),
    ]