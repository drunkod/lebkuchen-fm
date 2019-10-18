package xyz.deseteral.lebkuchenfm.domain.commands.processors

import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.RequestEntity
import xyz.deseteral.lebkuchenfm.IntegrationSpecification
import xyz.deseteral.lebkuchenfm.api.commands.text.model.TextCommandResponseDto

import static groovy.json.JsonOutput.toJson

class HelpCommandProcessorIntegrationTest extends IntegrationSpecification {
    def 'should display help message for all commands'() {
        given:
        def request = textCommandRequest('/fm help')

        when:
        def response = restTemplate.exchange(request, TextCommandResponseDto)

        then:
        response.statusCode == HttpStatus.OK
        response.body.response == """Lista komend:
                                    |- addx: Dodaje efekt dźwiękowy `addx sound name|url`
                                    |- help: Pokazuje tę wiadomość ;)
                                    |- listx: Wypisuje listę czaderskich dźwięków w bazie
                                    |- ping [p]: Ping pongs you""".stripMargin()
    }
}
