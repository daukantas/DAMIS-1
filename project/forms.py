#! coding: utf-8
from django import forms
from django.utils.translation import ugettext_lazy as _
from subprocess import Popen, PIPE


class LoginForm(forms.Form):
    username = forms.CharField(label=_('Naudotojo vardas'), max_length=100)
    password = forms.CharField(label=_(u'Slaptažodis'), max_length=128,
                        widget=forms.PasswordInput(render_value=False))

    def clean(self):
        cleaned_data = super(LoginForm, self).clean()
        if self.errors:
            return cleaned_data

        ## Validate login information
        login_check_cmd = """sshpass -p '%s' ssh %s@uosis.mif.vu.lt 'pwd'""" % (
                            cleaned_data.get('password'), cleaned_data.get('username'))
        login_response = Popen(login_check_cmd, shell=True, stdout=PIPE)
        if not login_response.communicate()[0]:
            raise forms.ValidationError(_(u'Naudotojo vardas arba slaptažodis yra neteisingas'))
        return cleaned_data
